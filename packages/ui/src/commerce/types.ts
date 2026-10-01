import type { AddToCartResult } from "../components/AddToCartForm";

/** Structural mirror of @repo/shopify-storefront's TileProduct so the UI stays API-agnostic. */
export interface MoneyData {
  amount: string;
  currencyCode: string;
}

export interface TileVariantData {
  id: string;
  title: string;
  availableForSale: boolean;
  price: MoneyData;
  compareAtPrice: MoneyData | null;
  selectedOptions: { name: string; value: string }[];
}

export interface TileProductData {
  id: string;
  handle: string;
  title: string;
  availableForSale: boolean;
  featuredImage: { url: string; altText: string | null } | null;
  price: MoneyData;
  compareAtPrice: MoneyData | null;
  brand: string;
  creditEarned: MoneyData | null;
  caseQuantity: number | null;
  container: string | null;
  pointsCost?: number | null;
  badges: string[];
  variants: TileVariantData[];
}

export interface FilterValueData {
  id: string;
  label: string;
  count: number;
  input: string;
}

export interface ListingFilterData {
  id: string;
  label: string;
  type: string;
  values: FilterValueData[];
}

export type AddToCartAction = (variantId: string, quantity: number) => Promise<AddToCartResult>;

export interface SortOptionData {
  value: string;
  label: string;
}
