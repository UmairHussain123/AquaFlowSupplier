import * as Yup from 'yup';

/** The "Other…" choice in the ticket category picker — its free text is sent instead. */
export const OTHER_CATEGORY = '__other__';

/** An optional numeric id field: empty is fine, anything typed must be a positive whole number. */
const optionalId = (message: string) =>
  Yup.number()
    .transform((value, original) =>
      original === '' || original === null || original === undefined
        ? undefined
        : value,
    )
    .typeError(message)
    .integer(message)
    .positive(message)
    .notRequired();

export const ticketSchema = Yup.object().shape({
  category: Yup.string().trim().required('Pick a category'),
  custom_category: Yup.string()
    .trim()
    .when('category', {
      is: OTHER_CATEGORY,
      then: schema =>
        schema
          .max(50, 'Keep the category short')
          .required('Type the category'),
    }),
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
    .integer('Enter a valid order ID')
    .positive('Enter a valid order ID')
    .required('Pick the order this is about'),
  container_transaction_id: optionalId('Enter a valid transaction ID'),
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
    .matches(/^\d{6}$/, "Enter the 6-digit code from the customer's app")
    .required('Enter the delivery code'),
});

export default ticketSchema;
