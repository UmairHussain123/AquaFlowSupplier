import {Api, applyAuthToken, clearAuthAndLogout, privateAPI} from './Config';
import type {
  ForgotPasswordResponse,
  LoginResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
  SupplierApplication,
  SupplierApplyPayload,
} from './AuthType/authType';

/**
 * Auth endpoints (Aquago Supplier API):
 *   POST /supplier/login
 *   POST /supplier/logout
 *   POST /supplier/forgot-password
 *   POST /supplier/reset-password
 *   POST /supplier/apply
 */

export const loginRequest = async (data: {
  email: string;
  password: string;
}): Promise<LoginResponse> => {
  const response = await Api.post<LoginResponse>('/supplier/login', {
    email: data.email,
    password: data.password,
  });

  // Make the token live for every later privateAPI call before we return.
  await applyAuthToken(response.data.token);

  return response.data;
};

// A second tap while one logout is in flight joins it instead of firing
// another POST /supplier/logout and a second reset to Login.
let logoutInFlight: Promise<void> | null = null;

export const logoutRequest = (): Promise<void> => {
  if (!logoutInFlight) {
    logoutInFlight = (async () => {
      try {
        await privateAPI.post('/supplier/logout');
      } catch {
        // Best-effort: the server-side token may already be gone (expired or
        // revoked elsewhere), which answers 401. Signing out locally must
        // succeed regardless.
      } finally {
        await clearAuthAndLogout();
      }
    })().finally(() => {
      logoutInFlight = null;
    });
  }
  return logoutInFlight;
};

export const forgotPasswordRequest = async (
  email: string,
): Promise<ForgotPasswordResponse> => {
  const {data} = await Api.post<ForgotPasswordResponse>(
    '/supplier/forgot-password',
    {email},
  );
  return data;
};

export const resetPasswordRequest = async (
  payload: ResetPasswordPayload,
): Promise<ResetPasswordResponse> => {
  const {data} = await Api.post<ResetPasswordResponse>(
    '/supplier/reset-password',
    payload,
  );
  return data;
};

export const applySupplierRequest = async (
  payload: SupplierApplyPayload,
): Promise<SupplierApplication> => {
  const {data} = await Api.post<{data: SupplierApplication}>(
    '/supplier/apply',
    payload,
  );
  return data.data;
};
