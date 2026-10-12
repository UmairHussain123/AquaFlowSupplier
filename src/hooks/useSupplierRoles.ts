import {useMemo} from 'react';
import {useSelector} from 'react-redux';
import {selectRoles} from '../Redux/slices/userSlice';

/**
 * Supplier-app role slugs, as the API returns them in `user.roles`.
 *
 * The API is the authority — these only decide what the app *offers*, so an
 * owner-only screen isn't shown to someone who would just get a 403 from it.
 */
export const ROLE_OWNER = 'supplier_owner';
export const ROLE_MANAGER = 'supplier_manager';
export const ROLE_RIDER = 'supplier_delivery_staff';

export interface SupplierRoles {
  /** Runs the supplier account: staff, shop details, payouts and earnings. */
  isOwner: boolean;
  /** Runs a shop day to day — an owner or a manager. */
  isShopManager: boolean;
  /** Delivery rider only: sees just the orders assigned to them. */
  isRiderOnly: boolean;
}

export const resolveRoles = (roles: string[] | undefined | null): SupplierRoles => {
  const list = roles ?? [];
  const isOwner = list.includes(ROLE_OWNER);
  const isShopManager = isOwner || list.includes(ROLE_MANAGER);
  return {
    isOwner,
    isShopManager,
    isRiderOnly: !isShopManager && list.includes(ROLE_RIDER),
  };
};

export function useSupplierRoles(): SupplierRoles {
  // Select a string, not the array: selectRoles hands back a fresh [] when
  // signed out, which would re-render every subscriber on each store update.
  const key = useSelector((state: any) => selectRoles(state).join(','));
  return useMemo(() => resolveRoles(key ? key.split(',') : []), [key]);
}

/** "supplier_owner" → "Owner" */
export const roleLabel = (slug: string): string =>
  slug === ROLE_OWNER
    ? 'Owner'
    : slug === ROLE_MANAGER
    ? 'Manager'
    : slug === ROLE_RIDER
    ? 'Rider'
    : slug.replace(/_/g, ' ');
