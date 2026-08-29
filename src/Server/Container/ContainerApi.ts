import {listShopOrders} from '../Order/OrdersApi';
import {toNumber} from '../../helper/helperFunction';
import dayjs from '../../helper/dateHelper';

/**
 * Container ledger — who is holding the shop's jars and how much deposit is
 * still against them.
 *
 * There is no ledger endpoint on the supplier API, so it is folded up from the
 * orders that carry a deposit: an order with an outstanding deposit means the
 * container has not come back yet.
 */

export interface LedgerRow {
  customerId: number;
  customer: string;
  onLoan: number;
  depositHeld: number;
  lastOrder: string;
}

export interface ContainerLedger {
  rows: LedgerRow[];
  totalJars: number;
  totalDeposits: number;
}

const OPEN_DEPOSIT = ['delivered', 'completed'];

export const getContainerLedger = async (
  shopId: number | string,
  days = 90,
): Promise<ContainerLedger> => {
  const page = await listShopOrders(shopId, {
    date_from: dayjs().subtract(days, 'day').format('YYYY-MM-DD'),
    date_to: dayjs().format('YYYY-MM-DD'),
    per_page: 200,
  });

  const byCustomer = new Map<number, LedgerRow>();

  (page.data ?? [])
    .filter(
      order =>
        OPEN_DEPOSIT.includes(order.order_status) &&
        toNumber(order.deposit_amount) > 0,
    )
    .forEach(order => {
      const id = order.customer_id;
      const existing = byCustomer.get(id);
      const deposit = toNumber(order.deposit_amount);

      if (existing) {
        existing.onLoan += 1;
        existing.depositHeld += deposit;
        // Orders come back newest-first, so the first date seen is the latest.
        return;
      }

      byCustomer.set(id, {
        customerId: id,
        customer: order.customer?.name ?? `Customer #${id}`,
        onLoan: 1,
        depositHeld: deposit,
        lastOrder: dayjs(order.created_at).fromNow(),
      });
    });

  const rows = Array.from(byCustomer.values()).sort(
    (a, b) => b.depositHeld - a.depositHeld,
  );

  return {
    rows,
    totalJars: rows.reduce((sum, row) => sum + row.onLoan, 0),
    totalDeposits: rows.reduce((sum, row) => sum + row.depositHeld, 0),
  };
};
