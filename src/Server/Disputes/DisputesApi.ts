import {privateAPI} from '../Config';

/**
 * Jar disputes for a shop — a count/damage/deposit disagreement on an order.
 * The supplier raises one and follows it; investigating and resolving is
 * admin-side, and arrives back as `status`, `resolution_notes` and
 * `financial_adjustment_amount`.
 *
 * Endpoints (Aquago Supplier API -> Disputes):
 *   GET  /supplier/shops/{shop}/disputes
 *   POST /supplier/shops/{shop}/disputes
 *   GET  /supplier/shops/{shop}/disputes/{id}
 */

export type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'rejected';

export interface DisputeActor {
  id: number;
  name: string;
}

/** The API returns this same flat shape for both list rows and the detail. */
export interface Dispute {
  id: number;
  reference: string;
  order_number: string | null;
  shop: string | null;
  claim: string;
  deposit: string | null;
  status: DisputeStatus;
  raised_by: DisputeActor | null;
  /** Server-rendered relative age, e.g. "3d". */
  age: string;
  resolution_notes: string | null;
  financial_adjustment_amount: string | null;
  created_at: string;
}

export interface DisputeListParams {
  per_page?: number;
  page?: number;
}

/** Laravel paginator — the page fields sit at the top level, not under `meta`. */
export interface PaginatedDisputes {
  current_page: number;
  data: Dispute[];
  last_page: number;
  per_page: number;
  total: number;
}

export interface RaiseDisputePayload {
  order_id: number;
  /** Only set when the dispute is about one specific jar movement. */
  container_transaction_id?: number | null;
  claim: string;
}

const disputesBase = (shopId: number | string) =>
  `/supplier/shops/${shopId}/disputes`;

export const listShopDisputes = async (
  shopId: number | string,
  params: DisputeListParams = {},
): Promise<PaginatedDisputes> => {
  const {data} = await privateAPI.get<PaginatedDisputes>(disputesBase(shopId), {
    params,
  });
  return data;
};

export const raiseDispute = async (
  shopId: number | string,
  payload: RaiseDisputePayload,
): Promise<Dispute> => {
  const {data} = await privateAPI.post<{data: Dispute}>(
    disputesBase(shopId),
    payload,
  );
  return data.data;
};

export const getDispute = async (
  shopId: number | string,
  disputeId: number | string,
): Promise<Dispute> => {
  const {data} = await privateAPI.get<{data: Dispute}>(
    `${disputesBase(shopId)}/${disputeId}`,
  );
  return data.data;
};

// --------------------
// Display helpers
// --------------------

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Open',
  investigating: 'Investigating',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

export const disputeStatusLabel = (status: DisputeStatus | string): string =>
  DISPUTE_STATUS_LABELS[status as DisputeStatus] ??
  status.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

/** open/investigating still need watching; resolved/rejected are closed. */
export const isDisputeLive = (dispute: Dispute): boolean =>
  dispute.status === 'open' || dispute.status === 'investigating';
