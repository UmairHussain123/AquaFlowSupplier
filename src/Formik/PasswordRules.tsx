import * as Yup from 'yup';

/**
 * Front-end mirror of the API's password policy: 8+ characters with a letter, a
 * number and a special character. The API enforces its own rules on top.
 */
export const PASSWORD_RULES = [
  {label: 'At least 8 characters', test: (v: string) => v.length >= 8},
  {label: 'A letter', test: (v: string) => /[A-Za-z]/.test(v)},
  {label: 'A number', test: (v: string) => /\d/.test(v)},
  {
    label: 'A special character',
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
];

export const isStrongPassword = (value: string): boolean =>
  PASSWORD_RULES.every(rule => rule.test(value ?? ''));

export const passwordRules = Yup.string()
  .required('Password is required')
  .test(
    'strong-password',
    'Use 8+ characters with a letter, a number and a special character',
    value => isStrongPassword(value ?? ''),
  );
