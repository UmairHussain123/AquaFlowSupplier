import type {CityRef} from '../Cities/CitiesApi';

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  /** The rider couldn't hand the order over; the reason is in `cancellation_reason`. */
  | 'delivery_failed';

export interface OrderListParams {
  status?: OrderStatus | string;
  payment_status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: 'id' | 'created_at' | 'total_amount' | 'order_status';
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface OrderCustomer {
  id: number;
  name: string;
  phone: string | null;
}

/**
 * Frozen copy of the customer's address taken when the order was placed.
 *
 * Field names mirror the `addresses` table and the coordinates arrive as
 * decimal strings ("24.8015000") — read it through `addressLine` /
 * `addressCoords` in OrdersApi rather than touching the fields directly. The
 * `line1`/`lat`/`lng` names are the older shape, still read as a fallback.
 */
export interface OrderAddressSnapshot {
  label?: string | null;
  address_line?: string | null;
  landmark?: string | null;
  area?: string | null;
  city?: CityRef;
  latitude?: string | number | null;
  longitude?: string | number | null;
  line1?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
}

/** Money fields come back as decimal strings (e.g. "220.00"), not numbers. */
export interface OrderListItem {
  id: number;
  order_number: string;
  customer_id: number;
  /** The shop user who placed it for the customer; null when the customer ordered in the app. */
  placed_by_id?: number | null;
  shop_id: number;
  address_snapshot: OrderAddressSnapshot | null;
  contact_phone: string | null;
  subtotal_amount: string;
  delivery_fee_amount: string;
  service_fee_amount: string;
  deposit_amount: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  payment_method: string;
  order_status: OrderStatus;
  payment_status: string;
  accepted_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  customer: OrderCustomer | null;
  /** Present on list and detail rows; carries the assigned rider. */
  delivery?: OrderDelivery | null;
}

export interface OrderItem {
  id: number;
  order_id: number;
  shop_product_id: number;
  container_type_id: number | null;
  product_name_snapshot: string;
  sku_snapshot: string | null;
  quantity: number;
  unit_price: string;
  discount_amount: string;
  tax_amount: string;
  deposit_amount: string;
}

export interface OrderStatusHistoryEntry {
  id: number;
  order_id: number;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  actor_id: number | null;
  reason: string | null;
  created_at: string;
}

export interface OrderDelivery {
  id: number;
  order_id: number;
  rider_id?: number | null;
  assigned_at?: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  rider?: {id: number; name: string} | null;
}

export interface OrderDetail extends OrderListItem {
  items: OrderItem[];
  status_history: OrderStatusHistoryEntry[];
  delivery: OrderDelivery | null;
}

export interface OrderMessage {
  id: number;
  message: string;
  created_at: string;
  sender_id?: number | null;
  sender_type?: string | null;
  sender?: {id: number; name: string} | null;
}

/** Laravel paginator — the page fields sit at the top level, not under `meta`. */
export interface PaginatedOrders {
  current_page: number;
  data: OrderListItem[];
  last_page: number;
  per_page: number;
  total: number;
}

/**
 * The four tabs from the design (SB2). Each maps onto the API statuses the
 * inbox should show under it — the API filters one status at a time, so a tab
 * with several statuses fetches them and merges.
 */
export const ORDER_TABS: {
  key: string;
  label: string;
  statuses: OrderStatus[];
}[] = [
  {key: 'new', label: 'New', statuses: ['placed']},
  {key: 'preparing', label: 'Preparing', statuses: ['accepted', 'preparing']},
  {key: 'onway', label: 'On way', statuses: ['out_for_delivery']},
  {
    key: 'done',
    label: 'Done',
    statuses: ['delivered', 'completed', 'rejected', 'cancelled', 'delivery_failed'],
  },
  // Everything in one list. It owns no status of its own — `orderTabKey` never
  // returns it, and the screen fills this bucket with the whole page — so an
  // order that somehow carries a status none of the tabs above claim is still
  // reachable here.
  {key: 'all', label: 'All', statuses: []},
];

export interface CreateOrderPayload {
  /** A hand-added customer from the shop's customer book (app customers can't be ordered for). */
  shop_customer_id: number;
  items: {shop_product_id: number; quantity: number}[];
  /** What the shop charges for delivery; defaults to 0. */
  delivery_fee?: number;
  /** Override the customer's saved address for this order. */
  address_line?: string;
  area?: string;
  /** Override the number the rider calls. */
  contact_phone?: string;
}
