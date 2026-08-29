import {privateAPI} from '../Config';

/**
 * Support tickets the supplier raises with Aqua Flow ops. Unlike orders,
 * products and disputes these are account-scoped, not shop-scoped — there's no
 * shop id in the path.
 *
 * Endpoints (Aquago Supplier API -> Support Tickets):
 *   GET  /supplier/support-tickets
 *   POST /supplier/support-tickets
 *   GET  /supplier/support-tickets/{id}
 *   POST /supplier/support-tickets/{id}/messages
 */

export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';

export interface TicketParty {
  id: number;
  name: string;
  phone?: string | null;
}

export interface TicketMessage {
  id: number;
  support_ticket_id: number;
  sender_id: number;
  message: string;
  attachment_path: string | null;
  created_at: string;
  updated_at: string;
  sender: TicketParty | null;
}

/** `order_id` is null for a ticket that isn't about one specific order. */
export interface SupportTicket {
  id: number;
  order_id: number | null;
  category: string;
  subject: string;
  status: TicketStatus;
  /** When ops are due to respond by. */
  sla_due_at: string | null;
  user: TicketParty | null;
  assignee: TicketParty | null;
  created_at: string;
}

/** The detail endpoint returns the list shape plus the message thread. */
export interface SupportTicketDetail extends SupportTicket {
  messages: TicketMessage[];
}

export interface ListTicketsParams {
  /** Comma-separated: open,pending,resolved,closed */
  status?: string;
  per_page?: number;
  page?: number;
}

/** Laravel paginator — the page fields sit at the top level, not under `meta`. */
export interface PaginatedTickets {
  current_page: number;
  data: SupportTicket[];
  last_page: number;
  per_page: number;
  total: number;
}

export interface CreateTicketPayload {
  /** Attach the ticket to an order when it's about one. */
  order_id?: number | null;
  category: string;
  subject: string;
}

const base = '/supplier/support-tickets';

export const listMyTickets = async (
  params: ListTicketsParams = {},
): Promise<PaginatedTickets> => {
  const {data} = await privateAPI.get<PaginatedTickets>(base, {params});
  return data;
};

export const getTicket = async (
  id: number | string,
): Promise<SupportTicketDetail> => {
  const {data} = await privateAPI.get<{data: SupportTicketDetail}>(
    `${base}/${id}`,
  );
  return data.data;
};

export const createTicket = async (
  payload: CreateTicketPayload,
): Promise<SupportTicket> => {
  const {data} = await privateAPI.post<{data: SupportTicket}>(base, payload);
  return data.data;
};

export const sendTicketMessage = async (
  id: number | string,
  message: string,
): Promise<TicketMessage> => {
  const {data} = await privateAPI.post<{data: TicketMessage}>(
    `${base}/${id}/messages`,
    {message},
  );
  return data.data;
};

// --------------------
// Display helpers
// --------------------

/**
 * The category enum isn't documented; these are the values seen in the API
 * collection and on live tickets. The form lets you type another one.
 */
export const TICKET_CATEGORIES = [
  {value: 'order_issue', label: 'Order issue'},
  {value: 'payouts', label: 'Payouts'},
  {value: 'billing', label: 'Billing'},
  {value: 'general', label: 'General'},
];

export const categoryLabel = (category: string): string =>
  TICKET_CATEGORIES.find(c => c.value === category)?.label ??
  category.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

export const TICKET_STATUSES: TicketStatus[] = [
  'open',
  'pending',
  'resolved',
  'closed',
];

/** open/pending are still live; resolved/closed are done. */
export const isTicketLive = (ticket: SupportTicket): boolean =>
  ticket.status === 'open' || ticket.status === 'pending';

/** True when ops are past their response deadline on a still-live ticket. */
export const isSlaBreached = (ticket: SupportTicket): boolean => {
  if (!ticket.sla_due_at || !isTicketLive(ticket)) return false;
  const due = new Date(ticket.sla_due_at).getTime();
  return !Number.isNaN(due) && due < Date.now();
};

/** The reply box is hidden once ops close the ticket. */
export const canReply = (ticket: SupportTicket | null): boolean =>
  !!ticket && ticket.status !== 'resolved' && ticket.status !== 'closed';
