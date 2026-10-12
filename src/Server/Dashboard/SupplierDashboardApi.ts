import {privateAPI} from '../Config';

/**
 * The owner's / manager's at-a-glance numbers, aggregated by the API: order
 * counts per shop, what each rider got through, and what is waiting on someone
 * right now. Owner and manager only. `date_from`/`date_to` default to today
 * and `shop_id` narrows it to one shop.
 *
 *   GET /supplier/dashboard
 *
 * `delivered_amount` is a decimal string; only orders that reached the
 * customer count towards it.
 */

export interface DashboardTotals {
  orders: number;
  new: number;
  in_progress: number;
  delivered: number;
  delivery_failed: number;
  rejected: number;
  cancelled: number;
  delivered_amount: string;
}

export interface DashboardShop extends DashboardTotals {
  id: number;
  public_name: string;
}

export interface DashboardRider {
  id: number;
  name: string;
  status: string;
  shop_id: number;
  assigned: number;
  pending_pickup: number;
  out_for_delivery: number;
  delivered: number;
  delivery_failed: number;
}

export interface SupplierDashboard {
  period: {from: string; to: string};
  totals: DashboardTotals;
  shops: DashboardShop[];
  riders: DashboardRider[];
  /** Live backlog, not period-bound. */
  attention: {
    awaiting_acceptance: number;
    awaiting_rider: number;
  };
}

export interface DashboardParams {
  shop_id?: number | string;
  /** YYYY-MM-DD */
  date_from?: string;
  date_to?: string;
}

export const getSupplierDashboard = async (
  params: DashboardParams = {},
): Promise<SupplierDashboard> => {
  const {data} = await privateAPI.get<{data: SupplierDashboard}>(
    '/supplier/dashboard',
    {params},
  );
  return data.data;
};

/**
 * Active riders for one shop — the assign-rider picker on order detail uses
 * this. The staff list is owner-only, but the dashboard lists the shop's riders
 * for owners and managers alike, which is exactly who may assign one.
 */
export const listShopRiders = async (
  shopId: number | string,
): Promise<DashboardRider[]> => {
  const dashboard = await getSupplierDashboard({shop_id: shopId});
  return (dashboard.riders ?? []).filter(rider => rider.status === 'active');
};
