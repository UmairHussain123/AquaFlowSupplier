import {privateAPI} from '../Config';

/**
 * Shop Products — the supplier's own listings for a shop. A listing points at a
 * master catalog product (`product_id`) and adds this shop's SKU, price,
 * deposit and stock.
 *
 * Endpoints (Aquago Supplier API -> Shop Products):
 *   GET    /supplier/shops/{shop}/products
 *   POST   /supplier/shops/{shop}/products
 *   PUT    /supplier/shops/{shop}/products/{id}
 *   DELETE /supplier/shops/{shop}/products/{id}
 *   POST   /supplier/shops/{shop}/products/{id}/adjust-stock
 */

/** How a container comes back to the shop, which decides whether a deposit applies. */
export type ReturnMode = 'refundable_deposit' | 'refill_only' | 'non_returnable';

export const RETURN_MODES: {value: ReturnMode; label: string; hint: string}[] = [
  {
    value: 'refundable_deposit',
    label: 'Refundable deposit',
    hint: 'Customer pays a deposit and gets it back when the container returns.',
  },
  {
    value: 'refill_only',
    label: 'Refill only',
    hint: 'Customer already owns the container — no deposit.',
  },
  {
    value: 'non_returnable',
    label: 'Non-returnable',
    hint: 'Sealed/disposable packaging that never comes back.',
  },
];

export interface ProductCategory {
  id: number;
  name: string;
}

export interface ProductBrand {
  id: number;
  name: string;
}

/** The master catalog product a listing points at (read-only for suppliers). */
export interface CatalogProduct {
  id: number;
  category_id: number;
  brand_id: number;
  name: string;
  size_value: string;
  size_unit: string;
  category: ProductCategory | null;
  brand: ProductBrand | null;
}

/** Money fields come back as decimal strings (e.g. "350.00"), not numbers. */
export interface ShopProduct {
  id: number;
  shop_id: number;
  product_id: number;
  sku: string | null;
  price: string;
  deposit_amount: string;
  return_mode: ReturnMode;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  image_path: string | null;
  created_at: string;
  updated_at: string;
  product: CatalogProduct | null;
}

export interface ShopProductListParams {
  /** Matches this listing's SKU or the product's name. */
  search?: string;
  category_id?: number | string;
  brand_id?: number | string;
  is_active?: 'true' | 'false';
  /** "true" to only show listings at or under their low_stock_threshold. */
  low_stock?: 'true';
  sort_by?: 'id' | 'price' | 'stock_quantity' | 'created_at';
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

/** Laravel paginator — the page fields sit at the top level, not under `meta`. */
export interface PaginatedShopProducts {
  current_page: number;
  data: ShopProduct[];
  last_page: number;
  per_page: number;
  total: number;
}

export interface AddShopProductPayload {
  product_id: number;
  sku: string;
  price: number;
  deposit_amount: number;
  return_mode: ReturnMode;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
}

/** Every field is optional — the API accepts a partial update. */
export type UpdateShopProductPayload = Partial<
  Omit<AddShopProductPayload, 'product_id'>
>;

export type StockReason = 'restock' | 'correction' | 'damage' | 'loss' | 'return';

export const STOCK_REASONS: {value: StockReason; label: string}[] = [
  {value: 'restock', label: 'Restock'},
  {value: 'correction', label: 'Stock-take correction'},
  {value: 'damage', label: 'Damaged'},
  {value: 'loss', label: 'Lost / stolen'},
  {value: 'return', label: 'Customer return'},
];

export interface AdjustStockPayload {
  /** Signed delta — positive adds stock, negative removes it. */
  change_quantity: number;
  reason: StockReason | string;
  notes?: string;
}

const productsBase = (shopId: number | string) =>
  `/supplier/shops/${shopId}/products`;

export const listShopProducts = async (
  shopId: number | string,
  params: ShopProductListParams = {},
): Promise<PaginatedShopProducts> => {
  const {data} = await privateAPI.get<PaginatedShopProducts>(
    productsBase(shopId),
    {params},
  );
  return data;
};

export const addShopProduct = async (
  shopId: number | string,
  payload: AddShopProductPayload,
): Promise<ShopProduct> => {
  const {data} = await privateAPI.post<{data: ShopProduct}>(
    productsBase(shopId),
    payload,
  );
  return data.data;
};

export const updateShopProduct = async (
  shopId: number | string,
  productId: number | string,
  payload: UpdateShopProductPayload,
): Promise<ShopProduct> => {
  const {data} = await privateAPI.put<{data: ShopProduct}>(
    `${productsBase(shopId)}/${productId}`,
    payload,
  );
  return data.data;
};

export const deleteShopProduct = async (
  shopId: number | string,
  productId: number | string,
): Promise<void> => {
  await privateAPI.delete(`${productsBase(shopId)}/${productId}`);
};

/** Signed stock change with a reason — the audited path, not a raw PUT. */
export const adjustShopProductStock = async (
  shopId: number | string,
  productId: number | string,
  payload: AdjustStockPayload,
): Promise<ShopProduct> => {
  const {data} = await privateAPI.post<{data: ShopProduct}>(
    `${productsBase(shopId)}/${productId}/adjust-stock`,
    payload,
  );
  return data.data;
};

// --------------------
// Display helpers
// --------------------

export const productLabel = (listing: ShopProduct): string =>
  listing.product?.name ?? `Product #${listing.product_id}`;

/** "19 L" — the badge on the left of every catalog row. */
export const productSize = (product: CatalogProduct | null): string => {
  if (!product) return '—';
  const value = Number(product.size_value);
  const size = Number.isNaN(value) ? product.size_value : String(value);
  return `${size}${product.size_unit}`;
};

export const returnModeLabel = (mode: ReturnMode | string): string =>
  RETURN_MODES.find(m => m.value === mode)?.label ??
  mode.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

export const isLowStock = (listing: ShopProduct): boolean =>
  listing.stock_quantity <= listing.low_stock_threshold;

export const isOutOfStock = (listing: ShopProduct): boolean =>
  listing.stock_quantity <= 0;

/**
 * The supplier API exposes no catalog/category/brand browse endpoint (those are
 * admin only), so the filter options are derived from whatever the listings
 * themselves carry.
 */
export const collectCategories = (listings: ShopProduct[]): ProductCategory[] => {
  const byId = new Map<number, ProductCategory>();
  listings.forEach(listing => {
    const category = listing.product?.category;
    if (category) byId.set(category.id, category);
  });
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
};

export const collectBrands = (listings: ShopProduct[]): ProductBrand[] => {
  const byId = new Map<number, ProductBrand>();
  listings.forEach(listing => {
    const brand = listing.product?.brand;
    if (brand) byId.set(brand.id, brand);
  });
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
};
