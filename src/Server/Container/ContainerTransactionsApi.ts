import {privateAPI} from '../Config';
import {toNumber} from '../../helper/helperFunction';

/**
 * Jar-deposit transactions for a shop — the returnable containers a customer
 * owes back and the deposit held against them. Owner and manager only.
 *
 *   GET  /supplier/shops/{shop}/container-transactions
 *   GET  /supplier/shops/{shop}/container-transactions/{id}
 *   POST /supplier/shops/{shop}/container-transactions/{id}/reconcile
 *
 * Only a `pending` transaction can be reconciled. Returned jars earn their
 * deposit back (capped at what was charged); damaged jars forfeit it. The
 * refund is worked out by the API. Money arrives as decimal strings.
 */

export type ContainerTransactionStatus =
  | 'pending'
  | 'confirmed'
  | 'disputed'
  | 'resolved'
  | string;

/** The list tabs — `pending` reads as "To reconcile" to the supplier. */
export const CONTAINER_TABS: {key: string; label: string; status?: string}[] = [
  {key: 'pending', label: 'To reconcile', status: 'pending'},
  {key: 'confirmed', label: 'Confirmed', status: 'confirmed'},
  {key: 'disputed', label: 'Disputed', status: 'disputed'},
  {key: 'resolved', label: 'Resolved', status: 'resolved'},
  {key: 'all', label: 'All'},
];

export interface ContainerTransaction {
  id: number;
  order_id: number;
  order_number: string | null;
  customer: {id: number; name: string} | null;
  shop: string | null;
  shop_id: number;
  container_type: {
    id: number;
    name: string;
    size_label: string | null;
    default_deposit_amount: string | null;
  } | null;
  expected_quantity: number;
  returned_quantity: number;
  damaged_quantity: number;
  outstanding_quantity: number;
  deposit_charged: string;
  deposit_refunded: string;
  deposit_held: number | string;
  status: ContainerTransactionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListContainerTransactionsParams {
  /** A comma-separated list is accepted by the API. */
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

/** Laravel paginator — the page fields sit at the top level, not under `meta`. */
export interface PaginatedContainerTransactions {
  current_page: number;
  data: ContainerTransaction[];
  last_page: number;
  per_page: number;
  total: number;
}

const base = (shopId: number | string) =>
  `/supplier/shops/${shopId}/container-transactions`;

export const listContainerTransactions = async (
  shopId: number | string,
  params: ListContainerTransactionsParams = {},
): Promise<PaginatedContainerTransactions> => {
  const {data} = await privateAPI.get<PaginatedContainerTransactions>(
    base(shopId),
    {params},
  );
  return data;
};

export const getContainerTransaction = async (
  shopId: number | string,
  id: number | string,
): Promise<ContainerTransaction> => {
  const {data} = await privateAPI.get<{data: ContainerTransaction}>(
    `${base(shopId)}/${id}`,
  );
  return data.data;
};

export interface ReconcilePayload {
  returned_quantity: number;
  damaged_quantity: number;
  notes?: string;
}

export const reconcileContainerTransaction = async (
  shopId: number | string,
  id: number | string,
  payload: ReconcilePayload,
): Promise<ContainerTransaction> => {
  const {data} = await privateAPI.post<{data: ContainerTransaction}>(
    `${base(shopId)}/${id}/reconcile`,
    payload,
  );
  return data.data;
};

/** What the API will refund for this count — the same formula it applies server-side. */
export const estimateRefund = (
  tx: ContainerTransaction,
  returned: number,
): number => {
  const perJar = toNumber(tx.container_type?.default_deposit_amount);
  return Math.min(returned * perJar, toNumber(tx.deposit_charged));
};

/** "19L Jar · 19 L" */
export const containerTypeLabel = (tx: ContainerTransaction): string => {
  const type = tx.container_type;
  if (!type) return 'Container';
  return [type.name, type.size_label].filter(Boolean).join(' · ');
};

export interface ContainerSummary {
  /** Jars still out with customers across the pending transactions. */
  outstandingJars: number;
  /** Deposit still held against them. */
  depositHeld: number;
  /** Transactions waiting to be reconciled. */
  pendingCount: number;
}

/** The headline numbers for the Shop tab card, from the pending transactions. */
export const getContainerSummary = async (
  shopId: number | string,
): Promise<ContainerSummary> => {
  const page = await listContainerTransactions(shopId, {
    status: 'pending',
    per_page: 100,
  });
  const rows = page.data ?? [];
  return {
    outstandingJars: rows.reduce(
      (sum, tx) => sum + toNumber(tx.outstanding_quantity),
      0,
    ),
    depositHeld: rows.reduce((sum, tx) => sum + toNumber(tx.deposit_held), 0),
    pendingCount: page.total ?? rows.length,
  };
};
