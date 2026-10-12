import {getProfile} from '../Account/AccountApi';
import type {Shop} from '../Shops/ShopsApi';

/**
 * SC2 (Compliance centre).
 *
 * The Aquago Supplier API exposes no supplier-facing document endpoints yet —
 * no list of the document set, no approval state, no expiry dates and no
 * upload route. Like the supplier web portal, the app therefore shows only what
 * it actually knows — the shop's listing status (GET /supplier/shops) and the
 * supplier account's approval status (GET /supplier/profile) — and sends
 * anything document-related to ops through a support ticket. Nothing here is
 * invented.
 */

export interface RequiredDocument {
  name: string;
  why: string;
}

/** The document set collected with the application. No state is held against it. */
export const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    name: 'Lab water test report',
    why: 'Proves the water is safe. Ops re-check this on a fixed cycle.',
  },
  {
    name: 'Food / business licence',
    why: 'Your licence to trade, as issued in your city.',
  },
  {
    name: 'Owner CNIC',
    why: 'Identity check on the account owner.',
  },
  {
    name: 'Shop & plant photos',
    why: 'Shows the premises and filling setup.',
  },
];

export interface ListingStatus {
  /** True only when customers can find the shop. */
  listed: boolean;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  message: string;
}

/** Honest copy for the shop's admin-controlled `status`. */
export const listingStatus = (shop: Shop | null): ListingStatus => {
  if (!shop) {
    return {
      listed: false,
      tone: 'neutral',
      message: 'No shop is linked to this account yet.',
    };
  }

  switch (shop.status) {
    case 'active':
      return {
        listed: true,
        tone: 'success',
        message: shop.is_open
          ? 'Your shop is approved and listed to customers.'
          : 'Your shop is approved and listed, but you have paused taking orders yourself.',
      };
    case 'paused':
      return {
        listed: false,
        tone: 'warning',
        message:
          "Aqua Flow has paused your shop, so customers can't order from it right now. Your own open/closed switch won't change this.",
      };
    case 'suspended':
      return {
        listed: false,
        tone: 'danger',
        message:
          "Your shop is suspended and hidden from customers. You can't lift this yourself — support can tell you why.",
      };
    default:
      return {
        listed: false,
        tone: 'neutral',
        message: 'Your shop is not currently listed to customers.',
      };
  }
};

/** What a non-active supplier account status means, or null when there is nothing to say. */
export const accountStatusMessage = (status: string | null): string | null => {
  switch (status) {
    case 'suspended':
      return "Aqua Flow has suspended your supplier account. Customers can't order from your shops until it is lifted.";
    case 'expired':
      return 'Your supplier approval has expired. Your compliance documents need renewing before Aqua Flow can keep your shops live.';
    default:
      return null;
  }
};

// The status banners sit on two tabs that both refetch on focus — a short
// per-user cache keeps that to one profile read instead of one per tab switch.
const CACHE_MS = 60 * 1000;
let cached: {userId: string; status: string | null; at: number} | null = null;

/**
 * The supplier account's approval status (`supplier_profile.status`), e.g.
 * "active", "suspended" or "expired". Null when the account has no supplier
 * profile.
 */
export const getSupplierAccountStatus = async (
  userId: string | number | null | undefined,
  force = false,
): Promise<string | null> => {
  const key = String(userId ?? '');
  if (
    !force &&
    cached &&
    cached.userId === key &&
    Date.now() - cached.at < CACHE_MS
  ) {
    return cached.status;
  }

  const profile = await getProfile();
  const status = profile.supplier_profile?.status ?? null;
  cached = {userId: key, status, at: Date.now()};
  return status;
};
