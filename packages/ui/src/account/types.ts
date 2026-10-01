/** Structural mirrors of @repo/shopify-customer account types, so the UI stays API-agnostic. */
export interface AccountMoney {
  amount: string;
  currencyCode: string;
}

export interface AccountFulfillmentData {
  status: string | null;
  latestShipmentStatus: string | null;
  createdAt?: string;
  updatedAt: string;
  tracking: { number: string | null; url: string | null; company: string | null }[];
  events?: { status: string; happenedAt: string }[];
}

export interface AccountOrderRowData {
  id: string;
  name: string;
  processedAt: string;
  fulfillmentStatus: string;
  financialStatus: string | null;
  totalPrice: AccountMoney;
  orderedBy: string | null;
  fulfillments: AccountFulfillmentData[];
}

export interface AccountNavItem {
  href: string;
  label: string;
  icon: AccountIconName;
}

export interface AccountNavGroup {
  label: string;
  items: AccountNavItem[];
}

export type AccountIconName = "dashboard" | "orders" | "credit" | "lists" | "user" | "club" | "users" | "invite" | "address";

export type AccountFormState = { ok: true; message?: string } | { ok: false; message: string } | null;
