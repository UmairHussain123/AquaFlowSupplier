import * as Yup from 'yup';

export const serviceZoneSchema = Yup.object().shape({
  radius_km: Yup.number()
    .typeError('Radius must be a number')
    .positive('Radius must be greater than zero')
    .required('Radius is required'),
  delivery_fee: Yup.number()
    .typeError('Delivery fee must be a number')
    .min(0, 'Delivery fee cannot be negative')
    .required('Delivery fee is required'),
  minimum_order_amount: Yup.number()
    .typeError('Minimum order must be a number')
    .min(0, 'Minimum order cannot be negative')
    .required('Minimum order is required'),
  estimated_delivery_minutes: Yup.number()
    .typeError('ETA must be a number')
    .integer('ETA must be a whole number of minutes')
    .positive('ETA must be greater than zero')
    .required('ETA is required'),
});

export const holidaySchema = Yup.object().shape({
  date: Yup.string().required('Pick a date'),
  reason: Yup.string().trim(),
});

export default serviceZoneSchema;
