import * as Yup from 'yup';

export const ticketSchema = Yup.object().shape({
  category: Yup.string().trim().required('Pick a category'),
  subject: Yup.string()
    .trim()
    .min(5, 'Say a little more so ops can route it')
    .required('Subject is required'),
  order_id: Yup.number().nullable(),
});

export const ticketMessageSchema = Yup.object().shape({
  message: Yup.string().trim().required('Write a message first'),
});

export const disputeSchema = Yup.object().shape({
  order_id: Yup.number()
    .typeError('Pick the order this is about')
    .required('Pick the order this is about'),
  claim: Yup.string()
    .trim()
    .min(10, 'Describe what happened so ops can decide')
    .required('Describe the claim'),
});

export const rejectOrderSchema = Yup.object().shape({
  reason: Yup.string().trim().required('A reason is required'),
});

export const deliveryOtpSchema = Yup.object().shape({
  code: Yup.string()
    .trim()
    .matches(/^\d{4,6}$/, "Enter the code from the customer's app")
    .required('Enter the delivery code'),
});

export default ticketSchema;
