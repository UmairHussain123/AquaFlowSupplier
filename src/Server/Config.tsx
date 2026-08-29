import axios from 'axios';
import {API_URL} from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import Route from '../Constant/NavigationStrings';
import {resetTo} from '../Navigatoin/NavigationService';
import {persistor, store} from '../Redux/store';
import {clearToken, getToken, saveToken} from '../helper/TokenStorageHelper';

// --------------------
// Base URL — the live Aquago staging API the supplier portal points at.
// --------------------
// export const BASE_URL = 'http://192.168.0.100:8000/api/v1';           // local
export const BASE_URL =
  API_URL || 'https://auqago-production.up.railway.app/api/v1';

console.log('baseUrl>>', BASE_URL);

// --------------------
// Axios instances
// --------------------

/** Authenticated API instance — every /supplier/* call goes through this. */
export const privateAPI = axios.create({
  baseURL: BASE_URL,
  headers: {
    common: {Authorization: ''},
  },
});

/** Public API instance (login, forgot/reset password, supplier application). */
export const Api = axios.create({
  baseURL: BASE_URL,
});

// --------------------
// In-memory token cache (keeps Keychain reads off the hot path)
// --------------------
let tokenCache: string | null = null;
let deviceIdCache: string | null = null;

export const REQUEST_CHANNEL = 'AQF-MBL';

const getPlatformUserAgent = () =>
  Platform.OS === 'ios' ? 'mobile-ios' : 'mobile-android';

const getDeviceId = async () => {
  if (deviceIdCache) return deviceIdCache;
  try {
    deviceIdCache = await DeviceInfo.getUniqueId();
    return deviceIdCache;
  } catch (error) {
    console.error('Error getting device id:', error);
    return null;
  }
};

export const getCommonRequestHeaders = async (
  headers: Record<string, any> = {},
) => {
  const nextHeaders: Record<string, any> = {
    Accept: 'application/json',
    ...headers,
    'User-Agent': getPlatformUserAgent(),
    channel: REQUEST_CHANNEL,
  };

  try {
    const deviceId = await getDeviceId();
    if (deviceId) nextHeaders['X-Device-Id'] = deviceId;
  } catch (error) {
    console.error('Error attaching common headers:', error);
  }

  return nextHeaders;
};

const attachCommonHeaders = async (config: any) => {
  config.headers = await getCommonRequestHeaders(config.headers || {});
  return config;
};

// --------------------
// Called from the login / logout flows
// --------------------
export const applyAuthToken = async (token: string) => {
  try {
    await saveToken(token); // persist securely
    await AsyncStorage.setItem('authToken', token); // legacy fallback
    tokenCache = token;
    privateAPI.defaults.headers.common.Authorization = `Bearer ${token}`;
  } catch (e) {
    console.error('applyAuthToken error:', e);
  }
};

export const clearAuthAndLogout = async () => {
  await clearToken();

  try {
    await AsyncStorage.removeItem('authToken');
  } catch (e) {
    console.warn('remove authToken error:', e);
  }

  tokenCache = null;
  delete privateAPI.defaults.headers.common.Authorization;

  try {
    store.dispatch({type: 'RESET_APP'});
  } catch (e) {
    console.warn('reset store error:', e);
  }

  // Defer the purge so it can't race an in-flight persist write.
  setTimeout(() => {
    try {
      persistor.purge();
    } catch {}
  }, 0);

  resetTo(Route.Login);
};

// --------------------
// Token initialization (on app start)
// --------------------
export const setPrivateApiToken = async () => {
  try {
    // Prefer the secure store, fall back to the legacy AsyncStorage copy.
    let authToken = await getToken();
    if (!authToken) authToken = await AsyncStorage.getItem('authToken');

    tokenCache = authToken;
    if (authToken) {
      privateAPI.defaults.headers.common.Authorization = `Bearer ${authToken}`;
    } else {
      delete privateAPI.defaults.headers.common.Authorization;
    }
  } catch (error) {
    console.error('Error setting token from Keychain:', error);
  }
};

// --------------------
// Request interceptors
// --------------------
privateAPI.interceptors.request.use(
  async config => {
    config = await attachCommonHeaders(config);

    try {
      if (!tokenCache) tokenCache = await getToken();
      if (tokenCache) {
        config.headers.Authorization = `Bearer ${tokenCache}`;
      } else {
        delete config.headers.Authorization;
      }
    } catch (err) {
      console.error('Error reading token in request interceptor:', err);
    }

    return config;
  },
  error => Promise.reject(error),
);

Api.interceptors.request.use(
  async config => attachCommonHeaders(config),
  error => Promise.reject(error),
);

// --------------------
// Response interceptor (global error handling)
// --------------------
/**
 * The auth screens surface their own inline errors and handle navigation
 * themselves — a global toast/bounce here would wipe their message.
 */
const AUTH_ENDPOINTS = [
  '/supplier/login',
  '/supplier/logout',
  '/supplier/forgot-password',
  '/supplier/reset-password',
  '/supplier/apply',
];

privateAPI.interceptors.response.use(
  response => response,
  async error => {
    const {response} = error;
    const originalConfig: any = error?.config || {};
    const url: string = originalConfig?.url ?? '';
    const isAuthEndpoint = AUTH_ENDPOINTS.some(endpoint =>
      url.startsWith(endpoint),
    );
    const suppressToast =
      !!originalConfig?.suppressToast ||
      originalConfig?.headers?.['X-Suppress-Toast'] === '1' ||
      isAuthEndpoint;

    // Cancellations are not failures.
    if (
      error?.code === 'ERR_CANCELED' ||
      error?.name === 'CanceledError' ||
      (typeof (axios as any).isCancel === 'function' &&
        (axios as any).isCancel(error))
    ) {
      return Promise.reject(error);
    }

    // 1) Network timeout
    if (error?.code === 'ECONNABORTED' || response?.status === 408) {
      if (!suppressToast) {
        Toast.show({
          type: 'error',
          text1: 'Request timed out',
          text2: 'Please check your internet connection and try again.',
        });
      }
    }
    // 2) Unauthenticated / token expired
    else if (
      response?.status === 401 ||
      response?.data?.message === 'Unauthenticated.'
    ) {
      const existingToken =
        tokenCache ||
        (await getToken()) ||
        (await AsyncStorage.getItem('authToken'));

      // No token at all — nothing to expire, let the caller handle it.
      if (!existingToken) return Promise.reject(error);

      // Retry once with a freshly-read token: a race between two calls can
      // otherwise read a half-written token and fake a "session expired".
      if (!originalConfig._retry) {
        originalConfig._retry = true;
        await setPrivateApiToken();
        const freshToken = tokenCache || existingToken;
        if (freshToken) {
          originalConfig.headers = originalConfig.headers || {};
          originalConfig.headers.Authorization = `Bearer ${freshToken}`;
          return privateAPI(originalConfig);
        }
      }

      if (!suppressToast) {
        Toast.show({
          type: 'error',
          text1: 'Session expired',
          text2: 'Please log in again.',
        });
      }
      await clearAuthAndLogout();
    }
    // 3) Not found
    else if (response?.status === 404) {
      if (!suppressToast) {
        Toast.show({
          type: 'error',
          text1: 'Not found',
          text2: 'No data found for your request.',
        });
      }
    }
    // 4) Forbidden
    else if (response?.status === 403) {
      if (!suppressToast) {
        Toast.show({
          type: 'error',
          text1: 'Forbidden',
          text2: "You don't have permission to perform this action.",
        });
      }
    }
    // 5) Validation
    else if (response?.status === 422) {
      // Forms render field errors themselves — no toast.
    }
    // 6) Server errors
    else if (response?.status >= 500) {
      if (!suppressToast) {
        Toast.show({
          type: 'error',
          text1: 'Server error',
          text2: 'Something went wrong on our end. Please try again later.',
        });
      }
    }
    // 7) Everything else
    else if (!suppressToast) {
      const message =
        response?.data?.message || error.message || 'An unexpected error occurred.';
      Toast.show({type: 'error', text1: 'Error', text2: message});
    }

    return Promise.reject(error);
  },
);

// --------------------
// Initialize the token on startup
// --------------------
setPrivateApiToken();
