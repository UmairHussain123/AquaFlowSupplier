import type {PillTone} from '../Common/Pill';
import type {OrderStatus} from '../../Server/Order/OrderType';

/** The `payment_status` values the order list can be filtered on. */
export const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'refund_pending',
  'refunded',
  'failed',
] as const;

/** Payment pill colour — mirrors the portal's OrderPill so both apps agree. */
export const paymentStatusTone = (
  status: string | null | undefined,
): PillTone => {
  switch (status) {
    case 'paid':
      return 'success';
    case 'pending':
    case 'unpaid':
    case 'refund_pending':
      return 'warning';
    case 'failed':
      return 'danger';
    default:
      return 'muted';
  }
};

/** Order status pill colour on the inbox cards (a placed order has its own "Awaiting you" pill). */
export const orderStatusTone = (status: OrderStatus | string): PillTone => {
  switch (status) {
    case 'delivered':
    case 'completed':
      return 'success';
    case 'delivery_failed':
      return 'danger';
    case 'rejected':
    case 'cancelled':
      return 'muted';
    default:
      return 'primary';
  }
};

/** Closed without reaching the customer — the detail screen shows a banner instead of progress. */
export const CLOSED_NEGATIVE: OrderStatus[] = [
  'rejected',
  'cancelled',
  'delivery_failed',
];

/** A rider can only be handed the order while the shop is still getting it ready. */
export const RIDER_ASSIGNABLE: OrderStatus[] = ['accepted', 'preparing'];
