export interface Address {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  zip: string | null;
  zoneCode: string | null;
  territoryCode: string | null;
  phoneNumber: string | null;
}

export interface CustomerProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddress: { emailAddress: string } | null;
  phoneNumber: { phoneNumber: string } | null;
  defaultAddress: Address | null;
}

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface OrderSummary {
  id: string;
  name: string;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string;
  statusPageUrl: string;
  totalPrice: Money;
}

export interface OrderLineItem {
  id: string;
  name: string;
  quantity: number;
  productId: string | null;
  variantId: string | null;
  price: Money | null;
  currentTotalPrice: Money | null;
  image: { url: string; altText: string | null; width: number | null; height: number | null } | null;
}

export interface OrderDetail extends OrderSummary {
  totalTax: Money | null;
  subtotal: Money | null;
  shippingAddress: Address | null;
  lineItems: OrderLineItem[];
}

export interface DefaultCompanyLocation {
  companyId: string;
  companyName: string;
  locationId: string;
  locationName: string;
}

/** One location the signed-in customer can act for, with the role they hold there. */
export interface CompanyLocationAccess {
  contactId: string;
  companyId: string;
  companyName: string;
  locationId: string;
  locationName: string;
  roleId: string | null;
  roleName: string | null;
  /** True when the role name contains "admin" (Shopify's built-in "Location admin"). */
  isAdmin: boolean;
}

/* ---------------------------------------------------------------- account pages */

/** The signed-in customer, their club (company) and the credit metafields the backend writes. */
export interface AccountOverview {
  customerId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  /** Company contact title, e.g. "Treasurer". */
  title: string | null;
  company: {
    id: string;
    name: string;
    /** Asahi account number (company external ID). */
    accountNumber: string | null;
    location: { id: string; name: string } | null;
    /** `custom.credit_balance` etc. Null when the backend hasn't written them. */
    creditBalance: Money | null;
    creditPending: Money | null;
    creditDonated: Money | null;
    referralCode: string | null;
    accountStatus: string | null;
  } | null;
}

export type ShipmentStatus = "CONFIRMED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "ATTEMPTED_DELIVERY" | "FAILURE" | string;

export interface AccountFulfillment {
  status: string | null;
  latestShipmentStatus: ShipmentStatus | null;
  createdAt?: string;
  updatedAt: string;
  tracking: { number: string | null; url: string | null; company: string | null }[];
  events?: { status: string; happenedAt: string }[];
}

export interface AccountOrderRow {
  id: string;
  name: string;
  number: number;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string;
  totalPrice: Money;
  orderedBy: string | null;
  fulfillments: AccountFulfillment[];
}

export interface AccountOrderAddress {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  zoneCode: string | null;
  zip: string | null;
  territoryCode: string | null;
}

export interface AccountOrderDetail extends Omit<AccountOrderRow, "number"> {
  updatedAt: string;
  note: string | null;
  subtotal: Money | null;
  totalTax: Money | null;
  totalShipping: Money | null;
  discounts: { code: string | null; amount: Money | null; percentage: number | null }[];
  paymentMethod: string | null;
  shippingAddress: AccountOrderAddress | null;
  billingAddress: AccountOrderAddress | null;
  shippingMethod: string | null;
  lineItems: {
    id: string;
    title: string;
    variantTitle: string | null;
    quantity: number;
    productId: string | null;
    variantId: string | null;
    totalPrice: Money | null;
    image: { url: string; altText: string | null } | null;
  }[];
}

/** What the sign-up gate needs: statuses come from `custom.account_status`. */
export interface AccessStatus {
  customerStatus: string | null;
  company: { id: string; status: string | null; locationId: string | null } | null;
}

export interface CompanyLocationAddress {
  address1: string | null;
  address2: string | null;
  city: string | null;
  zoneCode: string | null;
  zip: string | null;
  countryCode: string | null;
  recipient?: string | null;
}

export interface CompanyLocations {
  contactId: string;
  companyId: string;
  companyName: string;
  locations: { id: string; name: string; shippingAddress: CompanyLocationAddress | null; billingAddress: CompanyLocationAddress | null }[];
}
