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
