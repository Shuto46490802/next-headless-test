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

export interface CartLine {
  id: string;
  quantity: number;
  cost: { totalAmount: Money };
  merchandise: {
    id: string;
    title: string;
    image: ImageNode | null;
    product: { handle: string; title: string };
    selectedOptions: { name: string; value: string }[];
  };
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
  };
  lines: CartLine[];
}
