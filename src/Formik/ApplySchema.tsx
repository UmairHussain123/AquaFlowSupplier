import * as Yup from 'yup';
import {passwordRules} from './PasswordRules';

/** A Pakistani CNIC is 13 digits: 42101-1234567-1. */
export const CNIC_MAX_DIGITS = 13;

/** Digits only — the field itself accepts the dashed 42101-1234567-1 form. */
export const countDigits = (value?: string | null): number =>
  (value ?? '').replace(/\D/g, '').length;

/**
 * Types the dashes for you: 42101-1234567-1. Everything but digits is dropped
 * and the groups are rebuilt from scratch on every keystroke, so backspacing
 * over a dash removes the digit before it rather than getting stuck on it.
 */
export const formatCnic = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, CNIC_MAX_DIGITS);
  return [digits.slice(0, 5), digits.slice(5, 12), digits.slice(12)]
    .filter(Boolean)
    .join('-');
};

/**
 * The four wizard steps in SA2–SA5, validated one step at a time. Field names
 * match SupplierApplyPayload exactly so the submit is a straight pass-through.
 */
export const applySchema = Yup.object().shape({
  // Step 1 — supplier type + account
  supplier_type: Yup.string().required('Choose a supplier type'),
  name: Yup.string().trim().required('Full name is required'),
  email: Yup.string()
    .trim()
    .email('Enter a valid email address')
    .required('Email is required'),
  password: passwordRules,

  // Step 2 — shop & owner + GPS pin
  owner_name: Yup.string().trim().required('Owner name is required'),
  legal_name: Yup.string().trim(),
  cnic_number: Yup.string()
    .trim()
    // Dashes are allowed in the field, so the cap counts digits, not
    // characters — "42101-1234567-1" is 15 characters but 13 digits.
    .test(
      'cnic-max-digits',
      `CNIC cannot be more than ${CNIC_MAX_DIGITS} digits`,
      value => countDigits(value) <= CNIC_MAX_DIGITS,
    ),
  shop_public_name: Yup.string().trim().required('Shop name is required'),
  shop_branch_name: Yup.string().trim(),
  shop_description: Yup.string().trim(),
  shop_address_line: Yup.string().trim().required('Address is required'),
  shop_landmark: Yup.string().trim(),
  shop_city: Yup.string().trim().required('City is required'),
  shop_area: Yup.string().trim().required('Area is required'),
  shop_latitude: Yup.number()
    .typeError('Invalid latitude')
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude')
    .required('Latitude is required'),
  shop_longitude: Yup.number()
    .typeError('Invalid longitude')
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude')
    .required('Longitude is required'),

  // Step 4 — contact
  shop_contact_phone: Yup.string()
    .trim()
    .min(10, 'Enter a valid phone number')
    .required('Order phone is required'),
  shop_whatsapp_number: Yup.string().trim(),
});

/** Which fields each step is responsible for, for per-step validation. */
export const APPLY_STEPS: {title: string; fields: string[]}[] = [
  {
    title: 'Supplier type',
    fields: ['supplier_type', 'name', 'email', 'password'],
  },
  {
    title: 'Shop & GPS pin',
    fields: [
      'owner_name',
      'legal_name',
      'cnic_number',
      'shop_public_name',
      'shop_branch_name',
      'shop_description',
      'shop_address_line',
      'shop_landmark',
      'shop_city',
      'shop_area',
      'shop_latitude',
      'shop_longitude',
    ],
  },
  {title: 'Documents', fields: []},
  {
    title: 'Operations & payout',
    fields: ['shop_contact_phone', 'shop_whatsapp_number'],
  },
];

export default applySchema;
