import {privateAPI} from '../Config';

/**
 * Payments recorded against a shop's orders — read-only, so the owner can
 * reconcile the cash-on-delivery money collected. A payment's status follows
 * the order's delivery and settlement; the supplier can't change it. Owner and
 * manager only.
 *
 *   GET /supplier/shops/{shop}/payments
 *
 * Money arrives as decimal strings.
 */

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'voided' | string;

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'succeeded',
  'failed',
  'voided',
];

export interface Payment {
  id: number;
  order_id: number;
  provider: string | null;
  method: string | null;
  amount: string;
  currency: string | null;
  status: PaymentStatus;
  reference: string | null;
  created_at: string;
  order?: {
    id: number;
    order_number: string;
    order_status: string;
    payment_status: string;
    total_amount: string;
    customer?: {id: number; name: string} | null;
  } | null;
}

export interface ListPaymentsParams {
  status?: PaymentStatus;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

/** Laravel paginator — the page fields sit at the top level, not under `meta`. */
export interface PaginatedPayments {
  current_page: number;
  data: Payment[];
  last_page: number;
  per_page: number;
  total: number;
}

export const listShopPayments = async (
  shopId: number | string,
  params: ListPaymentsParams = {},
): Promise<PaginatedPayments> => {
  const {data} = await privateAPI.get<PaginatedPayments>(
    `/supplier/shops/${shopId}/payments`,
    {params},
  );
  return data;
};
