import type {SupplierUser} from '../../Redux/slices/userSlice';

export interface SignIn {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: SupplierUser;
}

export interface Forget {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  /** Only returned outside production — lets you finish the flow without an inbox. */
  reset_token?: string;
  note?: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export type SupplierType =
  | 'filtration_plant'
  | 'reseller'
  | 'brand_distributor'
  | 'hybrid';

export const SUPPLIER_TYPES: {
  value: SupplierType;
  label: string;
  description: string;
}[] = [
  {
    value: 'filtration_plant',
    label: 'Filtration / refill plant',
    description:
      'You filter and fill water yourself. Needs plant licence + lab report.',
  },
  {
    value: 'reseller',
    label: 'Reseller / shop',
    description: 'You sell sealed branded jars/bottles. Needs brand authorization.',
  },
  {
    value: 'brand_distributor',
    label: 'Brand distributor',
    description: 'Authorized territory for one or more brands.',
  },
  {
    value: 'hybrid',
    label: 'Hybrid',
    description: 'Own refill plus third-party brands. Both document sets apply.',
  },
];

export interface SupplierApplyPayload {
  name: string;
  email: string;
  password: string;
  supplier_type: SupplierType;
  owner_name: string;
  legal_name: string;
  cnic_number: string;
  shop_public_name: string;
  shop_branch_name: string;
  shop_description: string;
  shop_address_line: string;
  shop_landmark: string;
  shop_city: string;
  shop_area: string;
  shop_latitude: number;
  shop_longitude: number;
  shop_contact_phone: string;
  shop_whatsapp_number: string;
}

export interface SupplierApplication {
  id: number;
  owner_name: string;
  supplier_type: SupplierType;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  waiting_days: number;
  documents: {
    uploaded: number;
    required: number;
  };
  user: {
    id: number;
    name: string;
    phone: string | null;
    email: string;
  };
  proposed_shop: {
    public_name: string;
    branch_name: string | null;
    address_line: string;
    city: string;
    area: string;
    latitude: number;
    longitude: number;
    contact_phone: string;
    whatsapp_number: string | null;
  };
}
