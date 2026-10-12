import {privateAPI} from '../Config';

/**
 * The signed-in person's own account — every supplier-app role (owner,
 * manager, rider) can read and edit their own details and change their own
 * password.
 *
 *   GET   /supplier/profile
 *   PATCH /supplier/profile     {name?, email?, phone?, locale?}
 *   PUT   /supplier/password    {current_password, password, password_confirmation}
 *
 * Email is also the login identifier, so changing it changes how they sign in
 * (and un-verifies it). Phone must be a Pakistani mobile and is unique per
 * account.
 */

export type Locale = 'en' | 'ur';

export const LOCALES: {value: Locale; label: string}[] = [
  {value: 'en', label: 'English'},
  {value: 'ur', label: 'اردو (Urdu)'},
];

export interface ProfileShop {
  id: number;
  public_name: string;
  branch_name: string | null;
  city_id: number | null;
  city: string | null;
  status: string;
  is_open: boolean;
}

export interface Profile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  locale: Locale | string | null;
  status: string;
  last_login_at: string | null;
  roles: string[];
  supplier_profile: {
    id: number;
    legal_name: string | null;
    owner_name: string | null;
    supplier_type: string | null;
    status: string;
    shop_public_name: string | null;
  } | null;
  shops: ProfileShop[];
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  phone?: string;
  locale?: Locale;
}

export const getProfile = async (): Promise<Profile> => {
  const {data} = await privateAPI.get<{data: Profile}>('/supplier/profile');
  return data.data;
};

export const updateProfile = async (
  payload: UpdateProfilePayload,
): Promise<Profile> => {
  const {data} = await privateAPI.patch<{data: Profile}>(
    '/supplier/profile',
    payload,
  );
  return data.data;
};

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export const changePassword = async (
  payload: ChangePasswordPayload,
): Promise<string> => {
  const {data} = await privateAPI.put<{message: string}>(
    '/supplier/password',
    payload,
  );
  return data.message;
};
