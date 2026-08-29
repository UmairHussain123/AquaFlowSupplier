import {listShopOrders} from '../Order/OrdersApi';
import type {OrderListItem} from '../Order/OrderType';
import {toNumber} from '../../helper/helperFunction';
import dayjs from '../../helper/dateHelper';

/**
 * SB6 (Money). The supplier API exposes no earnings or payout endpoint, so the
 * week is computed from the delivered/completed orders the orders endpoint
 * returns — the same line items the design shows, derived rather than invented.
 *
 * The one number that can't be derived is the commission rate; the PRD fixes it
 * at 10% of water sales, and deposits are container liability that passes
 * straight through to Aqua Flow (so they are not commissionable).
 */

export const COMMISSION_RATE = 0.1;

export interface EarningsLine {
  label: string;
  value: number;
  /** How the amount reads in the breakdown: a credit, a deduction or neutral. */
  tone: 'neutral' | 'credit' | 'debit' | 'warn';
}

export interface WeeklyEarnings {
  periodLabel: string;
  gross: number;
  /** Mon–Sun totals for the bar chart on the gradient card. */
  daily: number[];
  lines: EarningsLine[];
  net: number;
  settlementDate: string;
  orders: OrderListItem[];
}

const SETTLED = ['delivered', 'completed'];

/** Monday of the week `offset` weeks back from this one. */
const weekStart = (offset = 0) =>
  dayjs()
    .subtract((dayjs().day() + 6) % 7, 'day')
    .subtract(offset * 7, 'day')
    .startOf('day');

export const getWeeklyEarnings = async (
  shopId: number | string,
  weekOffset = 0,
): Promise<WeeklyEarnings> => {
  const start = weekStart(weekOffset);
  const end = start.add(6, 'day');

  const page = await listShopOrders(shopId, {
    date_from: start.format('YYYY-MM-DD'),
    date_to: end.format('YYYY-MM-DD'),
    per_page: 200,
  });

  const orders = (page.data ?? []).filter(order =>
    SETTLED.includes(order.order_status),
  );

  const waterSales = orders.reduce(
    (sum, order) => sum + toNumber(order.subtotal_amount),
    0,
  );
  const deliveryFees = orders.reduce(
    (sum, order) => sum + toNumber(order.delivery_fee_amount),
    0,
  );
  const deposits = orders.reduce(
    (sum, order) => sum + toNumber(order.deposit_amount),
    0,
  );
  const discounts = orders.reduce(
    (sum, order) => sum + toNumber(order.discount_amount),
    0,
  );
  const commission = waterSales * COMMISSION_RATE;

  const gross = waterSales + deliveryFees + deposits;
  const net = gross - commission - deposits + discounts;

  // Mon–Sun buckets for the chart.
  const daily = Array.from({length: 7}, (_, index) => {
    const day = start.add(index, 'day');
    return orders
      .filter(order => dayjs(order.created_at).isSame(day, 'day'))
      .reduce((sum, order) => sum + toNumber(order.total_amount), 0);
  });

  return {
    periodLabel: `${start.format('D MMM')} – ${end.format('D MMM')}`,
    gross,
    daily,
    lines: [
      {label: 'Water sales', value: waterSales, tone: 'neutral'},
      {label: 'Delivery fees', value: deliveryFees, tone: 'neutral'},
      {label: 'Deposits collected', value: deposits, tone: 'warn'},
      {
        label: `Commission ${COMMISSION_RATE * 100}% of water sales`,
        value: -commission,
        tone: 'debit',
      },
      {label: 'Deposits passed to Aqua Flow', value: -deposits, tone: 'debit'},
      {label: 'Coupon reimbursement', value: discounts, tone: 'credit'},
    ],
    net,
    // Settlement runs the Friday after the week closes, with a 2-day dispute buffer.
    settlementDate: end.add(5, 'day').format('ddd, D MMM'),
    orders,
  };
};

export interface PayoutRow {
  label: string;
  value: number;
  tone: 'credit' | 'debit';
}

/**
 * Past weeks rolled up into the payout history list. Once a payouts endpoint
 * exists this is the single call to swap.
 */
export const getPayoutHistory = async (
  shopId: number | string,
  weeks = 3,
): Promise<PayoutRow[]> => {
  // allSettled: a single week failing shouldn't blank the whole history list.
  const settled = await Promise.allSettled(
    Array.from({length: weeks}, (_, index) =>
      getWeeklyEarnings(shopId, index + 1),
    ),
  );

  const results = settled
    .filter(
      (result): result is PromiseFulfilledResult<WeeklyEarnings> =>
        result.status === 'fulfilled',
    )
    .map(result => result.value);

  return results
    .filter(week => week.orders.length > 0)
    .map(week => ({
      label: `Payout · ${week.periodLabel}`,
      value: week.net,
      tone: week.net >= 0 ? ('credit' as const) : ('debit' as const),
    }));
};
