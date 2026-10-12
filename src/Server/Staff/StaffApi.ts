import {privateAPI} from '../Config';

/**
 * The owner's own staff — shop managers and delivery riders. Owner-only on the
 * API: a manager cannot mint more managers, and a non-owner gets a 403 from
 * every route here.
 *
 *   GET    /supplier/staff
 *   POST   /supplier/staff
 *   PATCH  /supplier/staff/{user}
 *   DELETE /supplier/staff/{user}     (revokes supplier-app access; the user row stays)
 */

export type StaffRole = 'supplier_manager' | 'supplier_delivery_staff';

export type StaffStatus = 'active' | 'suspended' | string;

export interface StaffAssignment {
  role: StaffRole | string;
  role_name: string;
  shop_id: number;
  shop_name: string | null;
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: StaffStatus;
  last_login_at: string | null;
  assignments: StaffAssignment[];
}

export interface StaffShopOption {
  id: number;
  public_name: string;
}

export interface StaffRoleOption {
  id: number;
  slug: StaffRole | string;
  name: string;
}

/** Laravel paginator plus the form's dropdown data, at the top level. */
export interface StaffListResponse {
  current_page: number;
  data: StaffMember[];
  last_page: number;
  per_page: number;
  total: number;
  available_roles: StaffRoleOption[];
  shops: StaffShopOption[];
}

export interface ListStaffParams {
  search?: string;
  role?: StaffRole;
  status?: string;
  shop_id?: number;
  per_page?: number;
  page?: number;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: StaffRole;
  shop_id: number;
}

/** Partial update. A role or shop change replaces the assignment rather than adding one. */
export interface UpdateStaffPayload {
  name?: string;
  phone?: string | null;
  password?: string;
  status?: 'active' | 'suspended';
  role?: StaffRole;
  shop_id?: number;
}

export const listStaff = async (
  params: ListStaffParams = {},
): Promise<StaffListResponse> => {
  const {data} = await privateAPI.get<StaffListResponse>('/supplier/staff', {
    params,
  });
  return data;
};

export const createStaff = async (
  payload: CreateStaffPayload,
): Promise<StaffMember> => {
  const {data} = await privateAPI.post<{data: StaffMember}>(
    '/supplier/staff',
    payload,
  );
  return data.data;
};

export const updateStaff = async (
  id: number | string,
  payload: UpdateStaffPayload,
): Promise<StaffMember> => {
  const {data} = await privateAPI.patch<{data: StaffMember}>(
    `/supplier/staff/${id}`,
    payload,
  );
  return data.data;
};

export const revokeStaff = async (id: number | string): Promise<void> => {
  await privateAPI.delete(`/supplier/staff/${id}`);
};

export const STAFF_ROLES: {value: StaffRole; label: string; hint: string}[] = [
  {
    value: 'supplier_manager',
    label: 'Manager',
    hint: 'Runs the shop day to day: orders, catalog, customers and settings.',
  },
  {
    value: 'supplier_delivery_staff',
    label: 'Rider',
    hint: 'Sees only the orders assigned to them, and delivers them.',
  },
];

export const staffRoleLabel = (role: string): string =>
  role === 'supplier_manager'
    ? 'Manager'
    : role === 'supplier_delivery_staff'
    ? 'Rider'
    : role;
