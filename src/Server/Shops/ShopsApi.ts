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

/** "Gulshan 6 · Karachi" for the dashboard subtitle. */
export const shopLocationLabel = (shop: Shop | null): string =>
  shop ? [shop.area, shop.city].filter(Boolean).join(' · ') : '—';
