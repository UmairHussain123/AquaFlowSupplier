import * as Yup from 'yup';
import {optionalMobile} from './CustomerSchema';
import {isStrongPassword, passwordRules} from './PasswordRules';

/**
 * Add / edit a manager or rider. The email is the login, so it's only set on
 * create; the password is required on create and optional on edit (blank keeps
 * the current one), but anything typed has to meet the policy either way.
 */
export const staffSchema = (isEdit: boolean) =>
  Yup.object().shape({
    name: Yup.string().trim().required('Name is required'),
    email: isEdit
      ? Yup.string()
      : Yup.string()
          .trim()
          .email('Enter a valid email')
          .required('Email is required'),
    phone: optionalMobile,
    password: isEdit
      ? Yup.string().test(
          'strong-password',
          'Use 8+ characters with a letter, a number and a special character',
          value => !value || isStrongPassword(value),
        )
      : passwordRules,
    role: Yup.string().required('Pick a role'),
    shop_id: Yup.string().required('Pick the shop this person works at'),
    status: Yup.string().oneOf(['active', 'suspended']),
  });

export default staffSchema;
