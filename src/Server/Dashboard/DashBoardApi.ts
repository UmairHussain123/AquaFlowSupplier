import {listShopOrders} from '../Order/OrdersApi';
import {listShopProducts} from '../Product/ProductsApi';
import type {OrderListItem} from '../Order/OrderType';
import type {ShopProduct} from '../Product/ProductsApi';
import {isLowStock} from '../Product/ProductsApi';
import {toNumber} from '../../helper/helperFunction';
import dayjs from '../../helper/dateHelper';

/**
 * The supplier API has no dashboard endpoint, so SB1 is assembled from the two
 * endpoints that do exist: today's orders and the shop's listings. Everything
 * here is real data — nothing is mocked.
 */

export interface DashboardSummary {
  ordersToday: number;
  deliveredToday: number;
  revenueToday: number;
  newOrders: OrderListItem[];
  lowStock: ShopProduct[];
  /** Deposits still sitting with customers, i.e. jars out on loan. */
  depositsOutstanding: number;
  emptiesOnLoan: number;
  weeklyGross: number;
}

const DELIVERED = ['delivered', 'completed'];

export const getDashboardSummary = async (
  shopId: number | string,
): Promise<DashboardSummary> => {
  const today = dayjs().format('YYYY-MM-DD');
  const weekStart = dayjs()
    .subtract((dayjs().day() + 6) % 7, 'day')
    .format('YYYY-MM-DD');

  // allSettled, not all: one slow or failing call must not blank the whole
  // dashboard — each card degrades to empty on its own.
  const [todayOrders, newOrders, weekOrders, products] = await Promise.allSettled([
    listShopOrders(shopId, {date_from: today, date_to: today, per_page: 100}),
    listShopOrders(shopId, {status: 'placed', per_page: 20}),
    listShopOrders(shopId, {date_from: weekStart, date_to: today, per_page: 200}),
    listShopProducts(shopId, {per_page: 100}),
  ]).then(results =>
    results.map(result =>
      result.status === 'fulfilled' ? result.value : null,
    ) as [
      Awaited<ReturnType<typeof listShopOrders>> | null,
      Awaited<ReturnType<typeof listShopOrders>> | null,
      Awaited<ReturnType<typeof listShopOrders>> | null,
      Awaited<ReturnType<typeof listShopProducts>> | null,
    ],
  );

  const todayRows = todayOrders?.data ?? [];
  const delivered = todayRows.filter(order =>
    DELIVERED.includes(order.order_status),
  );

  const weekRows = (weekOrders?.data ?? []).filter(order =>
    DELIVERED.includes(order.order_status),
  );

  return {
    ordersToday: todayOrders?.total ?? todayRows.length,
    deliveredToday: delivered.length,
    revenueToday: delivered.reduce(
      (sum, order) => sum + toNumber(order.total_amount),
      0,
    ),
    newOrders: newOrders?.data ?? [],
    lowStock: (products?.data ?? []).filter(isLowStock),
    // Every open deposit is a container the customer still has.
    depositsOutstanding: weekRows.reduce(
      (sum, order) => sum + toNumber(order.deposit_amount),
      0,
    ),
    emptiesOnLoan: weekRows.filter(order => toNumber(order.deposit_amount) > 0)
      .length,
    weeklyGross: weekRows.reduce(
      (sum, order) => sum + toNumber(order.total_amount),
      0,
    ),
  };
};
