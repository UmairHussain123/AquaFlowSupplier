import {privateAPI} from '../Config';
import {ORDER_TABS} from './OrderType';
import type {
  OrderDetail,
  OrderItem,
  OrderListParams,
  OrderMessage,
  OrderStatus,
  PaginatedOrders,
} from './OrderType';

/**
 * Orders for a shop.
 *
 * Endpoints (Aquago Supplier API -> Orders):
 *   GET  /supplier/shops/{shop}/orders
 *   GET  /supplier/shops/{shop}/orders/{id}
 *   POST /supplier/shops/{shop}/orders/{id}/accept
 *   POST /supplier/shops/{shop}/orders/{id}/reject
 *   POST /supplier/shops/{shop}/orders/{id}/prepare
 *   POST /supplier/shops/{shop}/orders/{id}/dispatch
 *   POST /supplier/shops/{shop}/orders/{id}/deliver     (delivery OTP)
 *   POST /supplier/shops/{shop}/orders/{id}/complete
 *   GET  /supplier/shops/{shop}/orders/{id}/messages
 *   POST /supplier/shops/{shop}/orders/{id}/messages
 */

const ordersBase = (shopId: number | string) =>
  `/supplier/shops/${shopId}/orders`;

export const listShopOrders = async (
  shopId: number | string,
  params: OrderListParams = {},
): Promise<PaginatedOrders> => {
  const {data} = await privateAPI.get<PaginatedOrders>(ordersBase(shopId), {
    params,
  });
  return data;
};

export const getOrder = async (
  shopId: number | string,
  orderId: number | string,
): Promise<OrderDetail> => {
  const {data} = await privateAPI.get<{data: OrderDetail}>(
    `${ordersBase(shopId)}/${orderId}`,
  );
  return data.data;
};

export const acceptOrder = async (
  shopId: number | string,
  orderId: number | string,
): Promise<OrderDetail> => {
  const {data} = await privateAPI.post<{data: OrderDetail}>(
    `${ordersBase(shopId)}/${orderId}/accept`,
  );
  return data.data;
};

export const rejectOrder = async (
  shopId: number | string,
  orderId: number | string,
  reason: string,
): Promise<OrderDetail> => {
  const {data} = await privateAPI.post<{data: OrderDetail}>(
    `${ordersBase(shopId)}/${orderId}/reject`,
    {reason},
  );
  return data.data;
};

export const prepareOrder = async (
  shopId: number | string,
  orderId: number | string,
): Promise<OrderDetail> => {
  const {data} = await privateAPI.post<{data: OrderDetail}>(
    `${ordersBase(shopId)}/${orderId}/prepare`,
  );
  return data.data;
};

export const dispatchOrder = async (
  shopId: number | string,
  orderId: number | string,
): Promise<OrderDetail> => {
  const {data} = await privateAPI.post<{data: OrderDetail}>(
    `${ordersBase(shopId)}/${orderId}/dispatch`,
  );
  return data.data;
};

/** The customer reads the code out of their app — the order can't close without it. */
export const deliverOrder = async (
  shopId: number | string,
  orderId: number | string,
  code: string,
): Promise<OrderDetail> => {
  const {data} = await privateAPI.post<{data: OrderDetail}>(
    `${ordersBase(shopId)}/${orderId}/deliver`,
    {code},
  );
  return data.data;
};

export const completeOrder = async (
  shopId: number | string,
  orderId: number | string,
): Promise<OrderDetail> => {
  const {data} = await privateAPI.post<{data: OrderDetail}>(
    `${ordersBase(shopId)}/${orderId}/complete`,
  );
  return data.data;
};

export const listOrderMessages = async (
  shopId: number | string,
  orderId: number | string,
): Promise<OrderMessage[]> => {
  const {data} = await privateAPI.get<{data: OrderMessage[]}>(
    `${ordersBase(shopId)}/${orderId}/messages`,
  );
  return data.data ?? [];
};

export const sendOrderMessage = async (
  shopId: number | string,
  orderId: number | string,
  message: string,
): Promise<OrderMessage> => {
  const {data} = await privateAPI.post<{data: OrderMessage}>(
    `${ordersBase(shopId)}/${orderId}/messages`,
    {message},
  );
  return data.data;
};

// --------------------
// Display helpers
// --------------------

/** Items carry no line total, so derive it from quantity x unit_price + deposit. */
export const lineTotal = (item: OrderItem): number =>
  item.quantity * Number(item.unit_price) + Number(item.deposit_amount ?? 0);

export const messageSenderLabel = (msg: OrderMessage): string =>
  msg.sender?.name ?? msg.sender_type ?? 'Message';

/** "3 x 19L refillable jar" — the one-line summary the inbox cards show. */
export const itemsSummary = (items: OrderItem[] | undefined): string => {
  if (!items?.length) return '—';
  const first = items[0];
  const head = `${first.quantity} x ${first.product_name_snapshot}`;
  return items.length > 1 ? `${head} + ${items.length - 1} more` : head;
};

/**
 * How many empty containers this order should hand back.
 *
 * A line with no deposit is a straight exchange, so every unit on it is an
 * empty coming back; a line carrying a deposit is one the customer is keeping
 * and paying for. The API gives a line-level deposit rather than a per-unit
 * one, so a partly-deposited line can't be split here — the rider adjusts the
 * count on the delivery screen, which is what it's for.
 */
export const emptiesExpected = (items: OrderItem[] | undefined): number =>
  (items ?? []).reduce(
    (total, item) =>
      total + (Number(item.deposit_amount) > 0 ? 0 : item.quantity),
    0,
  );

/** The colour treatment each status gets in the pills and badges. */
export const orderStatusTone = (
  status: OrderStatus | string,
): 'new' | 'live' | 'done' | 'dead' => {
  switch (status) {
    case 'placed':
      return 'new';
    case 'accepted':
    case 'preparing':
    case 'out_for_delivery':
      return 'live';
    case 'delivered':
    case 'completed':
      return 'done';
    default:
      return 'dead';
  }
};

/**
 * The next fulfilment step for an order, i.e. which button the detail screen
 * shows. `deliver` is the only one that needs input (the customer's OTP).
 */
export const nextOrderAction = (
  status: OrderStatus | string,
): 'accept' | 'prepare' | 'dispatch' | 'deliver' | 'complete' | null => {
  switch (status) {
    case 'placed':
      return 'accept';
    case 'accepted':
      return 'prepare';
    case 'preparing':
      return 'dispatch';
    case 'out_for_delivery':
      return 'deliver';
    case 'delivered':
      return 'complete';
    default:
      return null;
  }
};

export const ORDER_ACTION_LABELS: Record<string, string> = {
  accept: 'Accept order',
  prepare: 'Mark as filled',
  dispatch: 'Send out for delivery',
  deliver: 'Complete delivery',
  complete: 'Close order',
};

/** The four-step progress bar in SB4: accepted -> filled -> on way -> delivered. */
export const fulfilmentProgress = (status: OrderStatus | string): number => {
  switch (status) {
    case 'placed':
      return 0;
    case 'accepted':
      return 1;
    case 'preparing':
      return 2;
    case 'out_for_delivery':
      return 3;
    case 'delivered':
    case 'completed':
      return 4;
    default:
      return 0;
  }
};

/**
 * Which inbox tab a status belongs under. The inbox pulls one page of orders
 * and partitions it with this rather than querying per status — see the note in
 * OrderScreen.
 */
export const orderTabKey = (status: OrderStatus | string): string =>
  ORDER_TABS.find(tab => tab.statuses.includes(status as OrderStatus))?.key ??
  'done';

export const REJECTION_REASONS = [
  'Out of stock',
  'Outside delivery area',
  'Shop closing / no rider available',
  'Customer unreachable',
  'Other',
];
