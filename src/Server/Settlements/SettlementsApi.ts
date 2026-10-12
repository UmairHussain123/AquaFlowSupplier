import {privateAPI} from '../Config';
import dayjs from '../../helper/dateHelper';

/**
 * Settlements and payouts — what Aqua Flow owes this supplier and what it has
 * paid. Owner only.
 *
 *   GET /supplier/settlements
 *   GET /supplier/settlements/{id}
 *
 * These are supplier-profile scoped, not shop scoped: one settlement covers
 * every shop the supplier owns, so no shop id goes into the path.
 *
 * Money arrives as decimal strings ("554.60") — run it through formatMoney
 * rather than doing arithmetic on the raw field.
 */

/** `draft → approved → processing → paid`, plus `held`, `failed` and `reversed` off to the side. */
export type SettlementStatus =
  | 'draft'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'held'
  | 'reversed'
  | string;

/** Same set as a settlement — there is no `pending` payout status. */
export type PayoutStatus = SettlementStatus;

export interface PayoutAccount {
  id: number;
  account_title: string | null;
  bank_name: string | null;
  account_number_masked: string | null;
  is_verified: boolean;
}

export interface Payout {
  id: number;
  settlement_id: number;
  payout_account_id: number | null;
  amount: string;
  status: PayoutStatus;
  paid_at: string | null;
  reference: string | null;
  created_at: string;
  payout_account?: PayoutAccount | null;
}

/** One order's contribution to a settlement. */
export interface SettlementLine {
  id: number;
  settlement_id: number;
  order_id: number;
  gross_amount: string;
  commission_amount: string;
  net_amount: string;
  created_at: string;
  order?: {
    id: number;
    order_number: string;
    order_status: string;
    total_amount: string;
  } | null;
}

export interface Settlement {
  id: number;
  supplier_profile_id: number;
  period_start: string;
  period_end: string;
  gross_amount: string;
  commission_amount: string;
  net_payable: string;
  status: SettlementStatus;
  created_at: string;
  updated_at: string;
  /** Present on the list response only. */
  lines_count?: number;
}

/** The detail response adds the per-order breakdown and the payouts made against it. */
export interface SettlementDetail extends Settlement {
  lines?: SettlementLine[] | null;
  payouts?: Payout[] | null;
}

export interface PaginatedSettlements {
  current_page: number;
  data: Settlement[];
  last_page: number;
  per_page: number;
  total: number;
}

export const listSettlements = async (
  params: {per_page?: number; page?: number} = {},
): Promise<PaginatedSettlements> => {
  const {data} = await privateAPI.get<PaginatedSettlements>(
    '/supplier/settlements',
    {params},
  );
  return data;
};

export const getSettlement = async (
  id: number | string,
): Promise<SettlementDetail> => {
  const {data} = await privateAPI.get<{data: SettlementDetail}>(
    `/supplier/settlements/${id}`,
  );
  return data.data;
};

// --------------------
// Payout accounts (owner only)
// --------------------
//   GET    /supplier/payout-accounts
//   POST   /supplier/payout-accounts
//   DELETE /supplier/payout-accounts/{id}
//
// A new account always starts unverified — only Aqua Flow ops can verify it,
// and nothing is paid out to an unverified account. Removal is refused (422)
// while the account is locked or has payouts against it.

export interface ManagedPayoutAccount extends PayoutAccount {
  supplier_profile_id: number;
  iban: string | null;
  wallet_provider: string | null;
  /** While in the future the account is frozen for review. */
  locked_until: string | null;
  created_at: string;
}

export interface CreatePayoutAccountPayload {
  account_title: string;
  bank_name?: string;
  account_number_masked: string;
  iban?: string;
  wallet_provider?: string;
}

export const listPayoutAccounts = async (): Promise<ManagedPayoutAccount[]> => {
  const {data} = await privateAPI.get<{data: ManagedPayoutAccount[]}>(
    '/supplier/payout-accounts',
  );
  return data.data ?? [];
};

export const createPayoutAccount = async (
  payload: CreatePayoutAccountPayload,
): Promise<ManagedPayoutAccount> => {
  const {data} = await privateAPI.post<{data: ManagedPayoutAccount}>(
    '/supplier/payout-accounts',
    payload,
  );
  return data.data;
};

export const deletePayoutAccount = async (id: number | string): Promise<void> => {
  await privateAPI.delete(`/supplier/payout-accounts/${id}`);
};

/** Locked right now — the API stores a timestamp, so compare it with the clock. */
export const isAccountLocked = (account: {locked_until: string | null}): boolean =>
  Boolean(account.locked_until && dayjs(account.locked_until).isAfter(dayjs()));

// --------------------
// Display helpers
// --------------------

/** "10 – 16 Aug 2026", collapsing the month when both ends share it. */
export const formatPeriod = (start: string, end: string): string => {
  const from = dayjs(start);
  const to = dayjs(end);
  if (!from.isValid() || !to.isValid()) return '—';
  return from.isSame(to, 'month')
    ? `${from.format('D')} – ${to.format('D MMM YYYY')}`
    : `${from.format('D MMM YYYY')} – ${to.format('D MMM YYYY')}`;
};

export const formatDay = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = dayjs(iso);
  return d.isValid() ? d.format('D MMM YYYY') : '—';
};

/** How the payout account reads in the UI: "Meezan Bank · ****1234". */
export const describeAccount = (
  account: PayoutAccount | null | undefined,
): string | null => {
  if (!account) return null;
  const parts = [account.bank_name, account.account_number_masked].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
};

/**
 * The newest payout across a settlement's payouts — the one worth showing as
 * "this settlement's payment". Falls back to the first when none carry a date.
 */
export const latestPayout = (payouts: Payout[] | null | undefined): Payout | null => {
  if (!payouts?.length) return null;
  return (
    [...payouts].sort((a, b) => {
      const at = a.paid_at ? dayjs(a.paid_at).valueOf() : 0;
      const bt = b.paid_at ? dayjs(b.paid_at).valueOf() : 0;
      return bt - at;
    })[0] ?? null
  );
};
