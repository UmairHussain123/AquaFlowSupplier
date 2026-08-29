import * as Yup from 'yup';

export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .email('Enter a valid email address')
    .required('Email is required'),
  password: Yup.string().required('Password is required'),
});

export default loginSchema;
