import * as Yup from 'yup';
import {passwordRules} from './PasswordRules';

export const forgetSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .email('Enter a valid email address')
    .required('Email is required'),
});

export const resetPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .email('Enter a valid email address')
    .required('Email is required'),
  token: Yup.string().trim().required('Reset token is required'),
  password: passwordRules,
  password_confirmation: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords do not match')
    .required('Confirm your new password'),
});

export default forgetSchema;
