import * as Yup from 'yup';
import {isPakistaniMobile} from '../helper/phoneHelper';

const MOBILE_MESSAGE = 'Enter a full Pakistani mobile number (03XX-XXXXXXX)';

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

/**
 * The shop's own public details (PUT /supplier/shops/{shop}). `status` is the
 * admin-controlled approval state and isn't editable here; `capacity_per_day`
 * is optional and the API floors it at 0. Both phones are Pakistani mobiles,
 * typed through the 03XX-XXXXXXX mask.
 */
export const shopDetailsSchema = Yup.object().shape({
  public_name: Yup.string().trim().required('Shop name is required'),
  branch_name: Yup.string().trim(),
  description: Yup.string().trim(),
  address_line: Yup.string().trim().required('Address is required'),
  landmark: Yup.string().trim(),
  city: Yup.string().trim().required('Pick your city'),
  area: Yup.string().trim().required('Area is required'),
  contact_phone: Yup.string()
    .trim()
    .required('Contact phone is required')
    .test('pk-mobile', MOBILE_MESSAGE, value => isPakistaniMobile(value)),
  whatsapp_number: Yup.string()
    .trim()
    .test('pk-mobile', MOBILE_MESSAGE, value => !value || isPakistaniMobile(value)),
  capacity_per_day: Yup.string()
    .trim()
    .matches(/^\d*$/, 'Capacity must be a whole number'),
});
