import * as Yup from 'yup';
import {optionalMobile} from './CustomerSchema';
import {passwordRules} from './PasswordRules';

/** The signed-in person's own details (PATCH /supplier/profile). */
export const profileSchema = Yup.object().shape({
  name: Yup.string().trim().required('Name is required'),
  email: Yup.string()
    .trim()
    .email('Enter a valid email')
    .required('Email is required'),
  phone: optionalMobile,
  locale: Yup.string().oneOf(['en', 'ur']).required('Pick a language'),
});

/** PUT /supplier/password — the API re-checks the current password itself. */
export const changePasswordSchema = Yup.object().shape({
  current_password: Yup.string().required('Enter your current password'),
  password: passwordRules,
  password_confirmation: Yup.string()
    .required('Confirm your new password')
    .oneOf([Yup.ref('password')], "The new passwords don't match"),
});

/**
 * A Laravel 422's `{errors: {field: [msg]}}` flattened to `{field: msg}`, so
 * a form can show each message under its own field. Null for anything else.
 */
export const apiFieldErrors = (err: unknown): Record<string, string> | null => {
  const response = (
    err as {response?: {status?: number; data?: {errors?: unknown}}}
  )?.response;
  const errors = response?.data?.errors;
  if (response?.status !== 422 || !errors || typeof errors !== 'object') {
    return null;
  }

  const flat: Record<string, string> = {};
  Object.entries(errors as Record<string, unknown>).forEach(([field, value]) => {
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message === 'string') flat[field] = message;
  });
  return Object.keys(flat).length ? flat : null;
};

export default profileSchema;
