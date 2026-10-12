import {privateAPI} from '../Config';

/**
 * The signed-in user's own notification feed. Every supplier-app role has one.
 *
 *   GET  /supplier/notifications
 *   POST /supplier/notifications/{id}/read     (idempotent — keeps the first read_at)
 *   POST /supplier/notifications/read-all
 *
 * The feed is the delivery log: one row per notification actually sent on a
 * channel, so one event can appear twice (a push and an SMS). `unread_count`
 * covers every unread row, not just the page returned.
 */

export type NotificationChannel = 'push' | 'sms' | 'email' | 'in_app';

export const NOTIFICATION_CHANNELS: {value: NotificationChannel; label: string}[] = [
  {value: 'in_app', label: 'In app'},
  {value: 'push', label: 'Push'},
  {value: 'sms', label: 'SMS'},
  {value: 'email', label: 'Email'},
];

export interface AppNotification {
  id: number;
  user_id: number;
  template_key: string;
  channel: NotificationChannel | string;
  payload: Record<string, unknown> | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

/** Laravel paginator plus the unread roll-up, all at the top level. */
export interface NotificationsResponse {
  current_page: number;
  data: AppNotification[];
  last_page: number;
  per_page: number;
  total: number;
  unread_count: number;
}

export interface ListNotificationsParams {
  channel?: NotificationChannel;
  unread?: boolean;
  per_page?: number;
  page?: number;
}

export const listNotifications = async (
  params: ListNotificationsParams = {},
): Promise<NotificationsResponse> => {
  const {data} = await privateAPI.get<NotificationsResponse>(
    '/supplier/notifications',
    {params: {...params, unread: params.unread ? 1 : undefined}},
  );
  return data;
};

/**
 * Just the unread count, for the bell badge — one row is the cheapest page.
 * It runs in the background on every focus, so a failure stays quiet.
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  const {data} = await privateAPI.get<NotificationsResponse>(
    '/supplier/notifications',
    {params: {per_page: 1}, suppressToast: true},
  );
  return data.unread_count ?? 0;
};

export const markNotificationRead = async (
  id: number | string,
): Promise<AppNotification> => {
  const {data} = await privateAPI.post<{data: AppNotification}>(
    `/supplier/notifications/${id}/read`,
  );
  return data.data;
};

export const markAllNotificationsRead = async (): Promise<number> => {
  const {data} = await privateAPI.post<{marked_read: number}>(
    '/supplier/notifications/read-all',
  );
  return data.marked_read ?? 0;
};

// --------------------
// Display helpers
// --------------------

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim()
    ? value
    : typeof value === 'number'
    ? String(value)
    : null;

/** "order.rider_assigned" → "Order rider assigned" — fallback for keys with no custom copy. */
const keyLabel = (key: string): string => {
  const spaced = key.replace(/[._]/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

/** Readable headline for a notification row, built from its template key and payload. */
export const describeNotification = (n: AppNotification): string => {
  const p = n.payload ?? {};
  const order = text(p.order_number);
  const forOrder = order ? ` ${order}` : '';

  switch (n.template_key) {
    case 'order.placed':
      return `New order${forOrder}`;
    case 'order.rider_assigned':
      return `You were assigned order${forOrder}`;
    case 'order.rider_unassigned':
      return `Order${forOrder} was reassigned to another rider`;
    case 'order.accepted':
      return `Order${forOrder} accepted`;
    case 'order.out_for_delivery':
      return `Order${forOrder} is out for delivery`;
    case 'order.delivered':
      return `Order${forOrder} delivered`;
    case 'order.delivery_failed':
      return `Delivery failed for order${forOrder}`;
    case 'order.rejected':
      return `Order${forOrder} rejected`;
    case 'supplier_application.approved':
      return 'Your supplier application was approved';
    case 'supplier_document.expiring': {
      const doc = text(p.document_type)?.replace(/_/g, ' ') ?? 'A document';
      const days = text(p.expires_in_days);
      return `${doc.charAt(0).toUpperCase() + doc.slice(1)} expires${
        days ? ` in ${days} days` : ' soon'
      }`;
    }
    case 'shop_customer.app_access_granted':
      return 'A customer was given app access';
    default:
      return `${keyLabel(n.template_key)}${forOrder}`;
  }
};

/** The order a notification points at, when its payload names one. */
export const notificationOrderId = (n: AppNotification): number | null => {
  const id = text(n.payload?.order_id);
  if (!id) return null;
  const parsed = Number(id);
  return Number.isNaN(parsed) ? null : parsed;
};

export const channelLabel = (channel: string): string =>
  NOTIFICATION_CHANNELS.find(c => c.value === channel)?.label ?? channel;
