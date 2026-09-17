export interface Money {
  amount: string;
  currencyCode: string;
}

export interface ImageNode {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: Money;
  compareAtPrice: Money | null;
  selectedOptions: { name: string; value: string }[];
  image: ImageNode | null;
}

export interface ProductSummary {
  id: string;
  handle: string;
  title: string;
  featuredImage: ImageNode | null;
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  /** `mindarc_poc.points_cost` (points per unit). Null → cash only. */
  pointsCost: number | null;
}

export interface ProductDetail extends ProductSummary {
  descriptionHtml: string;
  images: ImageNode[];
  options: { name: string; values: string[] }[];
  variants: ProductVariant[];
}

export interface CollectionSummary {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: ImageNode | null;
}

export interface CollectionWithProducts extends CollectionSummary {
  products: {
    items: ProductSummary[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

/** Line item property that marks a cart line as paid with points. Value must be exactly "true". */
export const USE_POINTS_ATTRIBUTE = "_use_points";

export interface CartLineAttribute {
  key: string;
  value: string;
}

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
  attributes?: CartLineAttribute[];
}

export interface CartLineUpdateInput {
  id: string;
  quantity?: number;
  /** Replaces the line's attributes. Pass `[]` to clear (e.g. switch a points line back to cash). */
  attributes?: CartLineAttribute[];
}

export interface CartLine {
  id: string;
  quantity: number;
  attributes: CartLineAttribute[];
  /** Derived: `_use_points` attribute is exactly "true". */
  usePoints: boolean;
  cost: { totalAmount: Money };
  merchandise: {
    id: string;
    title: string;
    image: ImageNode | null;
    product: { handle: string; title: string; pointsCost: number | null };
    selectedOptions: { name: string; value: string }[];
  };
}

export interface CartBuyerIdentityInput {
  /** Customer Account API access token (or legacy Storefront customerAccessToken). */
  customerAccessToken?: string;
  email?: string;
  /** B2B: the company location the cart is purchasing for. Never set on D2C sites. */
  companyLocationId?: string;
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  buyerIdentity: {
    customer: { id: string } | null;
    /** Non-null only when the cart carries a company location the customer is a contact of. */
    purchasingCompany: {
      company: { id: string; name: string };
      location: { id: string; name: string };
    } | null;
  };
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
  };
  lines: CartLine[];
}
