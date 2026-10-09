import { createCustomerAccountClient, type CustomerAccountConfig } from "./client";
import {
  COMPANY_ACCESS_QUERY,
  DEFAULT_COMPANY_LOCATION_QUERY,
  ADDRESS_CREATE_MUTATION,
  ADDRESS_DELETE_MUTATION,
  ADDRESS_UPDATE_MUTATION,
  CUSTOMER_ADDRESSES_QUERY,
  CUSTOMER_PROFILE_QUERY,
  CUSTOMER_UPDATE_MUTATION,
  ORDER_DETAIL_QUERY,
  ORDERS_QUERY,
  ACCOUNT_OVERVIEW_QUERY,
  ACCESS_STATUS_QUERY,
  COMPANY_LOCATIONS_QUERY,
  ACCOUNT_ORDER_DETAIL_QUERY,
  LOCATION_ORDERS_QUERY,
  MY_ORDERS_QUERY,
} from "./queries";
import type {
  AccessStatus,
  CompanyLocations,
  AccountFulfillment,
  AccountOrderDetail,
  AccountOrderRow,
  AccountOverview,
  Address,
  CompanyLocationAccess,
  CustomerProfile,
  DefaultCompanyLocation,
  OrderDetail,
  OrderLineItem,
  OrderSummary,
} from "./types";

type RawOrderDetail = Omit<OrderDetail, "lineItems"> & { lineItems: { nodes: OrderLineItem[] } };

export * from "./types";
export * from "./oauth";
export * from "./session";
export * from "./pkce";
export * from "./access";
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


/* ---------------------------------------------------------------- account helpers */

type RawMoney = { amount: string; currencyCode: string };
type RawPurchaser = { contact?: { customer: { firstName: string | null; lastName: string | null } | null } | null; firstName?: string | null; lastName?: string | null } | null;
type RawFulfillment = {
  status: string | null;
  latestShipmentStatus: string | null;
  createdAt?: string;
  updatedAt: string;
  trackingInformation: { number: string | null; url: string | null; company: string | null }[];
  events?: { nodes: { status: string; happenedAt: string }[] };
};
type RawOrderRow = Omit<AccountOrderRow, "orderedBy" | "fulfillments"> & { purchasingEntity: RawPurchaser; fulfillments: { nodes: RawFulfillment[] } };

function personName(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string | null {
  const n = [p?.firstName, p?.lastName].filter(Boolean).join(" ");
  return n || null;
}
function orderedBy(e: RawPurchaser): string | null {
  return personName(e?.contact?.customer ?? e ?? null);
}
function mapFulfillment(f: RawFulfillment): AccountFulfillment {
  return {
    status: f.status,
    latestShipmentStatus: f.latestShipmentStatus,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    tracking: f.trackingInformation,
    events: f.events?.nodes,
  };
}
function mapOrderRow(o: RawOrderRow): AccountOrderRow {
  const { purchasingEntity, fulfillments, ...rest } = o;
  return { ...rest, orderedBy: orderedBy(purchasingEntity), fulfillments: fulfillments.nodes.map(mapFulfillment) };
}
/** Money metafields arrive as {"amount":"1.00","currency_code":"AUD"}; decimals as "1284.00". */
function metaMoney(value: string | undefined, currencyCode = "AUD"): RawMoney | null {
  if (value == null || value === "") return null;
  try {
    const v = JSON.parse(value) as unknown;
    if (typeof v === "number") return { amount: String(v), currencyCode };
    if (v && typeof v === "object" && "amount" in v) {
      const m = v as { amount: string | number; currency_code?: string };
      return { amount: String(m.amount), currencyCode: m.currency_code ?? currencyCode };
    }
  } catch {
    /* plain string */
  }
  return Number.isFinite(Number(value)) ? { amount: value, currencyCode } : null;
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

    /**
     * The location B2B carts default to: `companyContacts[0].locations[0]`. Null for a
     * customer with no company contact or no locations (i.e. a D2C shopper).
     */
    async getDefaultCompanyLocation(accessToken: string): Promise<DefaultCompanyLocation | null> {
      const data = await client.request<{
        customer: {
          companyContacts: {
            nodes: {
              company: { id: string; name: string } | null;
              locations: { nodes: { id: string; name: string }[] };
            }[];
          };
        };
      }>(accessToken, DEFAULT_COMPANY_LOCATION_QUERY);
      const contact = data.customer.companyContacts.nodes[0];
      const location = contact?.locations.nodes[0];
      if (!contact?.company || !location) return null;
      return {
        companyId: contact.company.id,
        companyName: contact.company.name,
        locationId: location.id,
        locationName: location.name,
      };
    },

    /**
     * Every company location the customer can act for, flattened, with their role at each.
     * Empty for a plain B2C customer.
     */
    async getCompanyAccess(accessToken: string): Promise<CompanyLocationAccess[]> {
      const data = await client.request<{
        customer: {
          id: string;
          companyContacts: {
            nodes: {
              id: string;
              company: { id: string; name: string } | null;
              locations: {
                nodes: {
                  id: string;
                  name: string;
                  roleAssignments: {
                    nodes: { id: string; role: { id: string; name: string }; contact: { id: string } }[];
                  };
                }[];
              };
            }[];
          };
        };
      }>(accessToken, COMPANY_ACCESS_QUERY);

      const out: CompanyLocationAccess[] = [];
      for (const contact of data.customer.companyContacts.nodes) {
        if (!contact.company) continue;
        for (const loc of contact.locations.nodes) {
          const mine = loc.roleAssignments.nodes.find((ra) => ra.contact.id === contact.id) ?? null;
          const roleName = mine?.role.name ?? null;
          out.push({
            contactId: contact.id,
            companyId: contact.company.id,
            companyName: contact.company.name,
            locationId: loc.id,
            locationName: loc.name,
            roleId: mine?.role.id ?? null,
            roleName,
            isAdmin: roleName?.toLowerCase().includes("admin") ?? false,
          });
        }
      }
      return out;
    },

    /** The customer's company and all its locations; null when they don't belong to one. */
    async getCompanyLocations(accessToken: string): Promise<CompanyLocations | null> {
      const data = await client.request<{
        customer: { companyContacts: { nodes: { id: string; company: { id: string; name: string } | null; locations: { nodes: CompanyLocations["locations"] } }[] } };
      }>(accessToken, COMPANY_LOCATIONS_QUERY);
      const c = data.customer.companyContacts.nodes[0];
      if (!c?.company) return null;
      return { contactId: c.id, companyId: c.company.id, companyName: c.company.name, locations: c.locations.nodes };
    },

    async getAccessStatus(accessToken: string): Promise<AccessStatus> {
      const data = await client.request<{
        customer: {
          accountStatus: { value: string } | null;
          companyContacts: { nodes: { company: { id: string; accountStatus: { value: string } | null } | null; locations: { nodes: { id: string }[] } }[] };
        };
      }>(accessToken, ACCESS_STATUS_QUERY);
      const contact = data.customer.companyContacts.nodes[0];
      return {
        customerStatus: data.customer.accountStatus?.value ?? null,
        company: contact?.company
          ? { id: contact.company.id, status: contact.company.accountStatus?.value ?? null, locationId: contact.locations.nodes[0]?.id ?? null }
          : null,
      };
    },

    async getAccountOverview(accessToken: string): Promise<AccountOverview> {
      const data = await client.request<{
        customer: {
          id: string;
          firstName: string | null;
          lastName: string | null;
          emailAddress: { emailAddress: string } | null;
          phoneNumber: { phoneNumber: string } | null;
          companyContacts: {
            nodes: {
              title: string | null;
              company: { id: string; name: string; externalId: string | null; metafields: ({ key: string; value: string } | null)[] } | null;
              locations: { nodes: { id: string; name: string; externalId: string | null }[] };
            }[];
          };
        };
      }>(accessToken, ACCOUNT_OVERVIEW_QUERY);
      const c = data.customer;
      const contact = c.companyContacts.nodes[0];
      const meta: Record<string, string> = {};
      for (const m of contact?.company?.metafields ?? []) if (m) meta[m.key] = m.value;
      const loc = contact?.locations.nodes[0] ?? null;
      return {
        customerId: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.emailAddress?.emailAddress ?? null,
        phone: c.phoneNumber?.phoneNumber ?? null,
        title: contact?.title ?? null,
        company: contact?.company
          ? {
              id: contact.company.id,
              name: contact.company.name,
              accountNumber: contact.company.externalId ?? loc?.externalId ?? null,
              location: loc ? { id: loc.id, name: loc.name } : null,
              creditBalance: metaMoney(meta.credit_balance),
              creditPending: metaMoney(meta.credit_pending),
              creditDonated: metaMoney(meta.credit_donated),
              referralCode: meta.referral_code ?? null,
              accountStatus: meta.account_status ?? null,
            }
          : null,
      };
    },

    /**
     * Orders & invoices. "company" lists every order for the location (all users), "mine" the
     * customer's own. `query` uses Shopify order search syntax, e.g. "name:1042".
     */
    async listAccountOrders(
      accessToken: string,
      opts: { scope: "company" | "mine"; locationId?: string | null; first?: number; after?: string | null; query?: string | null },
    ): Promise<{ orders: AccountOrderRow[]; hasNextPage: boolean; endCursor: string | null }> {
      const vars = { first: opts.first ?? 20, after: opts.after ?? null, query: opts.query || null };
      type Conn = { nodes: RawOrderRow[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
      let conn: Conn | null = null;
      if (opts.scope === "company" && opts.locationId) {
        const data = await client.request<{ companyLocation: { orders: Conn } | null }>(accessToken, LOCATION_ORDERS_QUERY, { ...vars, locationId: opts.locationId });
        conn = data.companyLocation?.orders ?? null;
      }
      if (!conn) {
        const data = await client.request<{ customer: { orders: Conn } }>(accessToken, MY_ORDERS_QUERY, vars);
        conn = data.customer.orders;
      }
      return { orders: conn.nodes.map(mapOrderRow), hasNextPage: conn.pageInfo.hasNextPage, endCursor: conn.pageInfo.endCursor };
    },

    async getAccountOrder(accessToken: string, id: string): Promise<AccountOrderDetail | null> {
      type Raw = Omit<AccountOrderDetail, "orderedBy" | "fulfillments" | "discounts" | "paymentMethod" | "shippingMethod" | "lineItems"> & {
        purchasingEntity: RawPurchaser;
        fulfillments: { nodes: RawFulfillment[] };
        discountApplications: { nodes: { code?: string; value: { amount?: string; currencyCode?: string; percentage?: number } }[] };
        transactions: { kind: string | null; status: string | null; type: string; paymentDetails: { cardBrand?: string; last4?: string } | null }[];
        shippingLine: { title: string } | null;
        lineItems: { nodes: AccountOrderDetail["lineItems"] };
      };
      const data = await client.request<{ order: Raw | null }>(accessToken, ACCOUNT_ORDER_DETAIL_QUERY, { id });
      const o = data.order;
      if (!o) return null;
      const { purchasingEntity, fulfillments, discountApplications, transactions, shippingLine, lineItems, ...rest } = o;
      const card = transactions.find((t) => t.paymentDetails?.last4)?.paymentDetails;
      return {
        ...rest,
        orderedBy: orderedBy(purchasingEntity),
        fulfillments: fulfillments.nodes.map(mapFulfillment),
        discounts: discountApplications.nodes.map((d) => ({
          code: d.code ?? null,
          amount: d.value.amount != null ? { amount: d.value.amount, currencyCode: d.value.currencyCode ?? "AUD" } : null,
          percentage: d.value.percentage ?? null,
        })),
        paymentMethod: card ? `${card.cardBrand ?? "Card"} •••• ${card.last4}` : transactions.length ? "Paid" : null,
        shippingMethod: shippingLine?.title ?? null,
        lineItems: lineItems.nodes,
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
