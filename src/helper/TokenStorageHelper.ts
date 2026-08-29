import * as Keychain from 'react-native-keychain';
import {Platform} from 'react-native';

const SERVICE = 'com.aquaflowsupplier.authToken';

export async function saveToken(token: string) {
  try {
    await Keychain.setGenericPassword('auth', token, {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      ...(Platform.OS === 'android'
        ? {securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE}
        : {}),
    });
  } catch {
    // Android emulators and older devices have no hardware-backed keystore.
    await Keychain.setGenericPassword('auth', token, {
      service: SERVICE,
      ...(Platform.OS === 'android'
        ? {securityLevel: Keychain.SECURITY_LEVEL.ANY}
        : {}),
    });
  }
}

export async function getToken() {
  try {
    const creds = await Keychain.getGenericPassword({service: SERVICE});
    return creds ? creds.password : null;
  } catch (error) {
    console.warn('getToken error:', error);
    return null;
  }
}

export async function clearToken() {
  try {
    await Keychain.resetGenericPassword({service: SERVICE});
  } catch (error) {
    console.warn('clearToken error:', error);
  }
}
