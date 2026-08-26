import { createCustomerAccountClient, type CustomerAccountConfig } from "./client";
import {
  ADDRESS_CREATE_MUTATION,
  ADDRESS_DELETE_MUTATION,
  ADDRESS_UPDATE_MUTATION,
  CUSTOMER_ADDRESSES_QUERY,
  CUSTOMER_PROFILE_QUERY,
  CUSTOMER_UPDATE_MUTATION,
  ORDER_DETAIL_QUERY,
  ORDERS_QUERY,
} from "./queries";
import type { Address, CustomerProfile, OrderDetail, OrderLineItem, OrderSummary } from "./types";

type RawOrderDetail = Omit<OrderDetail, "lineItems"> & { lineItems: { nodes: OrderLineItem[] } };

export * from "./types";
export * from "./oauth";
export * from "./session";
export * from "./pkce";
export { CustomerAccountApiError } from "./client";

interface UserError {
  field: string[] | null;
  message: string;
}

function assertNoErrors(userErrors: UserError[]) {
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((e) => e.message).join(", "));
  }
}

export function createShopifyCustomerAccount(config: CustomerAccountConfig) {
  const client = createCustomerAccountClient(config);

  return {
    client,

    async getProfile(accessToken: string): Promise<CustomerProfile> {
      const data = await client.request<{ customer: CustomerProfile }>(
        accessToken,
        CUSTOMER_PROFILE_QUERY,
      );
      return data.customer;
    },

    async updateProfile(
      accessToken: string,
      input: { firstName?: string; lastName?: string },
    ): Promise<void> {
      const data = await client.request<{
        customerUpdate: { userErrors: UserError[] };
      }>(accessToken, CUSTOMER_UPDATE_MUTATION, { input });
      assertNoErrors(data.customerUpdate.userErrors);
    },

    async listAddresses(
      accessToken: string,
    ): Promise<{ addresses: Address[]; defaultAddressId: string | null }> {
      const data = await client.request<{
        customer: { defaultAddress: { id: string } | null; addresses: { nodes: Address[] } };
      }>(accessToken, CUSTOMER_ADDRESSES_QUERY);
      return {
        addresses: data.customer.addresses.nodes,
        defaultAddressId: data.customer.defaultAddress?.id ?? null,
      };
    },

    async createAddress(
      accessToken: string,
      address: Partial<Omit<Address, "id">>,
      makeDefault = false,
    ): Promise<Address> {
      const data = await client.request<{
        customerAddressCreate: { customerAddress: Address; userErrors: UserError[] };
      }>(accessToken, ADDRESS_CREATE_MUTATION, { address, defaultAddress: makeDefault });
      assertNoErrors(data.customerAddressCreate.userErrors);
      return data.customerAddressCreate.customerAddress;
    },

    async updateAddress(
      accessToken: string,
      addressId: string,
      address: Partial<Omit<Address, "id">>,
      makeDefault?: boolean,
    ): Promise<Address> {
      const data = await client.request<{
        customerAddressUpdate: { customerAddress: Address; userErrors: UserError[] };
      }>(accessToken, ADDRESS_UPDATE_MUTATION, {
        addressId,
        address,
        defaultAddress: makeDefault ?? null,
      });
      assertNoErrors(data.customerAddressUpdate.userErrors);
      return data.customerAddressUpdate.customerAddress;
    },

    async deleteAddress(accessToken: string, addressId: string): Promise<void> {
      const data = await client.request<{
        customerAddressDelete: { userErrors: UserError[] };
      }>(accessToken, ADDRESS_DELETE_MUTATION, { addressId });
      assertNoErrors(data.customerAddressDelete.userErrors);
    },

    async listOrders(
      accessToken: string,
      opts: { first?: number; after?: string } = {},
    ): Promise<{ orders: OrderSummary[]; hasNextPage: boolean; endCursor: string | null }> {
      const data = await client.request<{
        customer: {
          orders: {
            nodes: OrderSummary[];
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
          };
        };
      }>(accessToken, ORDERS_QUERY, { first: opts.first ?? 20, after: opts.after ?? null });
      return {
        orders: data.customer.orders.nodes,
        hasNextPage: data.customer.orders.pageInfo.hasNextPage,
        endCursor: data.customer.orders.pageInfo.endCursor,
      };
    },

    async getOrder(accessToken: string, id: string): Promise<OrderDetail | null> {
      const data = await client.request<{ order: RawOrderDetail | null }>(
        accessToken,
        ORDER_DETAIL_QUERY,
        { id },
      );
      if (!data.order) return null;
      const { lineItems, ...rest } = data.order;
      return { ...rest, lineItems: lineItems.nodes };
    },
  };
}

export type ShopifyCustomerAccount = ReturnType<typeof createShopifyCustomerAccount>;
