import {privateAPI} from '../Config';

/**
 * A shop's customer book: walk-in regulars and delivery households the shop
 * adds itself, plus app customers who have ordered from it (recorded
 * automatically, phone always masked). Owner and manager only — riders get a 403.
 *
 *   GET   /supplier/customer-types                          (active types)
 *   GET   /supplier/shops/{shop}/customers
 *   POST  /supplier/shops/{shop}/customers
 *   PATCH /supplier/shops/{shop}/customers/{id}
 *   POST  /supplier/shops/{shop}/customers/{id}/app-access
 *
 * The list is **cursor**-paginated (`next_cursor`), not page-numbered.
 */

export type CustomerSource = 'shop' | 'app';

export interface CustomerType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface ShopCustomer {
  id: number;
  name: string;
  /** Raw for `shop` rows (the shop typed it); masked for `app` rows. */
  phone: string | null;
  customer_type_id: number;
  customer_type: string;
  customer_type_name: string | null;
  source: CustomerSource;
  address_line: string | null;
  area: string | null;
  notes: string | null;
  has_app_access: boolean;
  app_access_granted_at: string | null;
  created_at: string;
}

export interface CustomersPage {
  data: ShopCustomer[];
  per_page: number;
  next_cursor: string | null;
  prev_cursor: string | null;
}

export interface ListCustomersParams {
  customer_type_id?: number | string;
  source?: CustomerSource;
  has_app_access?: boolean;
  /** Matches the name, or the phone of hand-added rows only. */
  search?: string;
  cursor?: string;
  per_page?: number;
}

export interface CustomerPayload {
  name?: string;
  phone?: string | null;
  customer_type_id?: number;
  address_line?: string | null;
  area?: string | null;
  notes?: string | null;
}

const customersBase = (shopId: number | string) =>
  `/supplier/shops/${shopId}/customers`;

export const listCustomerTypes = async (): Promise<CustomerType[]> => {
  const {data} = await privateAPI.get<{data: CustomerType[]}>(
    '/supplier/customer-types',
  );
  return data.data ?? [];
};

export const listShopCustomers = async (
  shopId: number | string,
  params: ListCustomersParams = {},
): Promise<CustomersPage> => {
  const {data} = await privateAPI.get<CustomersPage>(customersBase(shopId), {
    params: {
      ...params,
      has_app_access:
        params.has_app_access === undefined
          ? undefined
          : params.has_app_access
          ? 1
          : 0,
    },
  });
  return data;
};

export const createShopCustomer = async (
  shopId: number | string,
  payload: CustomerPayload,
): Promise<ShopCustomer> => {
  const {data} = await privateAPI.post<{data: ShopCustomer}>(
    customersBase(shopId),
    payload,
  );
  return data.data;
};

export const updateShopCustomer = async (
  shopId: number | string,
  customerId: number | string,
  payload: CustomerPayload,
): Promise<ShopCustomer> => {
  const {data} = await privateAPI.patch<{data: ShopCustomer}>(
    `${customersBase(shopId)}/${customerId}`,
    payload,
  );
  return data.data;
};

/** Lets a hand-added customer sign in to the customer app with the number on file. */
export const grantCustomerAppAccess = async (
  shopId: number | string,
  customerId: number | string,
): Promise<ShopCustomer> => {
  const {data} = await privateAPI.post<{data: ShopCustomer}>(
    `${customersBase(shopId)}/${customerId}/app-access`,
  );
  return data.data;
};
