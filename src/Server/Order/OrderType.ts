export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'rejected'
  | 'cancelled';

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

export interface OrderAddressSnapshot {
  lat: number | null;
  lng: number | null;
  line1: string | null;
  area: string | null;
  city: string | null;
}

/** Money fields come back as decimal strings (e.g. "220.00"), not numbers. */
export interface OrderListItem {
  id: number;
  order_number: string;
  customer_id: number;
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
  dispatched_at: string | null;
  delivered_at: string | null;
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
    statuses: ['delivered', 'completed', 'rejected', 'cancelled'],
  },
];
