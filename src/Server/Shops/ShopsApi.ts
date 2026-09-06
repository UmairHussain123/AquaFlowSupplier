import {privateAPI} from '../Config';

export interface Shop {
  id: number;
  supplier_profile_id: number;
  public_name: string;
  branch_name: string | null;
  description: string | null;
  address_line: string;
  landmark: string | null;
  city: string;
  area: string;
  latitude: string;
  longitude: string;
  contact_phone: string;
  whatsapp_number: string | null;
  status: 'active' | 'paused' | 'suspended' | string;
  rating_avg: string;
  /** Orders the shop can take in a day — null when no cap is set. */
  capacity_per_day: number | null;
  /** Admin-controlled search weighting; read-only here. */
  ranking_boost: number | null;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Shops the signed-in supplier can act on. A supplier_owner gets every shop
 * under their profile; a manager/delivery-staff account gets only the one
 * they're assigned to. The login response carries no shop info, so this is how
 * the app learns its shop_id.
 *
 *   GET /supplier/shops
 */
export const listShops = async (): Promise<Shop[]> => {
  const {data} = await privateAPI.get<{data: Shop[]}>('/supplier/shops');
  return data.data ?? [];
};

/**
 * One shop, fresh from the server — 403 when it isn't one you manage.
 *
 *   GET /supplier/shops/{shop}
 */
export const getShop = async (shopId: number | string): Promise<Shop> => {
  const {data} = await privateAPI.get<{data: Shop}>(`/supplier/shops/${shopId}`);
  return data.data;
};

/**
 * The shop's own public details. `status` is the admin-controlled approval
 * state and is not accepted here — pausing yourself is `is_open: false`.
 */
export interface UpdateShopPayload {
  public_name?: string;
  branch_name?: string | null;
  description?: string | null;
  address_line?: string;
  landmark?: string | null;
  city?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  contact_phone?: string;
  whatsapp_number?: string | null;
  /** 0 or more; null lifts the cap. */
  capacity_per_day?: number | null;
  is_open?: boolean;
}

/**
 * Partial update — send only what changed.
 *
 *   PUT /supplier/shops/{shop}
 */
export const updateShop = async (
  shopId: number | string,
  payload: UpdateShopPayload,
): Promise<Shop> => {
  const {data} = await privateAPI.put<{data: Shop}>(
    `/supplier/shops/${shopId}`,
    payload,
  );
  return data.data;
};

/** Open/pause the shop to customers without touching the weekly hours. */
export const setShopOpenState = async (
  shopId: number | string,
  isOpen: boolean,
): Promise<Shop> => updateShop(shopId, {is_open: isOpen});

/** "Gulshan 6 · Karachi" for the dashboard subtitle. */
export const shopLocationLabel = (shop: Shop | null): string =>
  shop ? [shop.area, shop.city].filter(Boolean).join(' · ') : '—';

/** "200 orders / day" for the shop details row, or a note that there's no cap. */
export const capacityLabel = (shop: Shop | null): string =>
  shop?.capacity_per_day
    ? `${shop.capacity_per_day} orders / day`
    : 'No daily cap set';
