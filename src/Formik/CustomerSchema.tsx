import * as Yup from 'yup';
import {isPakistaniMobile} from '../helper/phoneHelper';

export const PHONE_MESSAGE =
  'Phone must be a full Pakistani mobile number (03XX-XXXXXXX)';

/** An optional mobile field: empty is fine, anything typed must be a full 03XX number. */
export const optionalMobile = Yup.string()
  .trim()
  .test('pk-mobile', PHONE_MESSAGE, value => !value || isPakistaniMobile(value));

/**
 * Add / edit a customer in the shop's book. Mirrors the portal's
 * CustomerFormModal: only the name and type are required, and the phone is
 * locked (and not validated) once the customer signs in with it.
 */
export const customerSchema = Yup.object().shape({
  name: Yup.string().trim().required('Name is required'),
  customer_type_id: Yup.string().required('Pick a customer type'),
  phone: optionalMobile,
  address_line: Yup.string().trim().max(255, 'Keep the address under 255 characters'),
  area: Yup.string().trim().max(255, 'Keep the area under 255 characters'),
  notes: Yup.string().trim().max(1000, 'Keep notes under 1000 characters'),
});

export default customerSchema;
