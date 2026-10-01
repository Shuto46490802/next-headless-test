import type { StorefrontClient } from "./client";
import {
  COLLECTION_LISTING_QUERY,
  POPULAR_PRODUCTS_QUERY,
  PREDICTIVE_SEARCH_QUERY,
  PRODUCT_PAGE_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
  SEARCH_COUNT_QUERY,
  SEARCH_PRODUCTS_QUERY,
} from "./commerce-queries";
import type { ImageNode, Money } from "./types";

/* ------------------------------------------------------------------ types */

export interface TileVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: Money;
  compareAtPrice: Money | null;
  selectedOptions: { name: string; value: string }[];
}

/** Everything a product tile, search row or related rail needs. */
export interface TileProduct {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  featuredImage: ImageNode | null;
  price: Money;
  maxPrice: Money;
  compareAtPrice: Money | null;
  /** `custom.brand`, falling back to the vendor. */
  brand: string;
  /** `custom.credit_earned` per unit (Club Connect). */
  creditEarned: Money | null;
  caseQuantity: number | null;
  container: string | null;
  pointsCost: number | null;
  /** Badge tags (`badge:quick-sale` → "quick-sale"). */
  badges: string[];
  variants: TileVariant[];
}

export interface ProductPageData extends TileProduct {
  descriptionHtml: string;
  images: ImageNode[];
  options: { name: string; values: string[] }[];
  collections: { handle: string; title: string }[];
  specs: Record<string, string>;
  allVariants: (TileVariant & { image: ImageNode | null })[];
}

export interface FilterValue {
  id: string;
  label: string;
  count: number;
  /** JSON-encoded ProductFilter input, passed back verbatim to filter by this value. */
  input: string;
}

export interface ListingFilter {
  id: string;
  label: string;
  type: "LIST" | "PRICE_RANGE" | "BOOLEAN" | string;
  values: FilterValue[];
}

export interface ProductListing {
  products: TileProduct[];
  filters: ListingFilter[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  /** Known for search; for collections it is derived from the availability filter when present. */
  totalCount: number | null;
}

export interface CollectionListing extends ProductListing {
  collection: { id: string; handle: string; title: string; description: string; image: ImageNode | null };
}

export interface PredictiveResults {
  queries: string[];
  collections: { handle: string; title: string }[];
  products: TileProduct[];
}

/** Sort options shown in the toolbar. `value` is what goes in the URL. */
export const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest in" },
  { value: "best-selling", label: "Best selling" },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/* ------------------------------------------------------------------ mapping */

type MetaValue = { value: string } | null;
interface RawTile {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  featuredImage: ImageNode | null;
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  compareAtPriceRange: { maxVariantPrice: Money };
  pointsCostMetafield: MetaValue;
  brand: MetaValue;
  creditEarned: MetaValue;
  caseQuantity: MetaValue;
  container: MetaValue;
  variants: { nodes: TileVariant[] };
}
interface RawPage extends RawTile {
  descriptionHtml: string;
  images: { nodes: ImageNode[] };
  options: { name: string; optionValues: { name: string }[] }[];
  collections: { nodes: { handle: string; title: string }[] };
  specs: ({ key: string; value: string } | null)[];
  allVariants: { nodes: (TileVariant & { image: ImageNode | null })[] };
}
interface RawFilter {
  id: string;
  label: string;
  type: string;
  values: { id: string; label: string; count: number; input: unknown }[];
}

function int(m: MetaValue): number | null {
  if (!m) return null;
  const n = Number.parseInt(m.value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Money metafields are stored as `{"amount":"4.0","currency_code":"AUD"}`. */
function money(m: MetaValue): Money | null {
  if (!m) return null;
  try {
    const v = JSON.parse(m.value) as { amount?: string; currency_code?: string };
    if (!v.amount || Number(v.amount) <= 0) return null;
    return { amount: v.amount, currencyCode: v.currency_code ?? "AUD" };
  } catch {
    return null;
  }
}

export function mapTile(raw: RawTile): TileProduct {
  const price = raw.priceRange.minVariantPrice;
  const compare = raw.compareAtPriceRange.maxVariantPrice;
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    vendor: raw.vendor,
    productType: raw.productType,
    tags: raw.tags,
    availableForSale: raw.availableForSale,
    featuredImage: raw.featuredImage,
    price,
    maxPrice: raw.priceRange.maxVariantPrice,
    compareAtPrice: Number(compare.amount) > Number(price.amount) ? compare : null,
    brand: raw.brand?.value || raw.vendor,
    creditEarned: money(raw.creditEarned),
    caseQuantity: int(raw.caseQuantity),
    container: raw.container?.value ?? null,
    pointsCost: int(raw.pointsCostMetafield),
    badges: raw.tags.filter((t) => t.startsWith("badge:")).map((t) => t.slice("badge:".length)),
    variants: raw.variants.nodes,
  };
}

function mapFilters(raw: RawFilter[]): ListingFilter[] {
  return raw.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type,
    values: f.values.map((v) => ({
      id: v.id,
      label: v.label,
      count: v.count,
      input: typeof v.input === "string" ? v.input : JSON.stringify(v.input),
    })),
  }));
}

/** Total from the availability filter (in stock + out of stock), which Search & Discovery ships by default. */
function totalFromFilters(filters: ListingFilter[]): number | null {
  const availability = filters.find((f) => f.id === "filter.v.availability");
  if (!availability) return null;
  return availability.values.reduce((sum, v) => sum + v.count, 0);
}

function sortFor(sort: SortValue | undefined, context: "collection" | "search") {
  switch (sort) {
    case "price-asc":
      return { sortKey: "PRICE", reverse: false };
    case "price-desc":
      return { sortKey: "PRICE", reverse: true };
    case "newest":
      return context === "collection" ? { sortKey: "CREATED", reverse: true } : { sortKey: "RELEVANCE", reverse: false };
    case "best-selling":
      return context === "collection" ? { sortKey: "BEST_SELLING", reverse: false } : { sortKey: "RELEVANCE", reverse: false };
    default:
      return context === "collection" ? { sortKey: "COLLECTION_DEFAULT", reverse: false } : { sortKey: "RELEVANCE", reverse: false };
  }
}

/** Parses the `filter` URL params (each a JSON ProductFilter input) and drops anything malformed. */
export function parseFilterParams(values: string[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const v of values) {
    try {
      const parsed = JSON.parse(v) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) out.push(parsed as Record<string, unknown>);
    } catch {
      /* ignore */
    }
  }
  return out;
}

/* ------------------------------------------------------------- state picker */

/**
 * Partner Connect state availability.
 *
 * Merchant rule: every product is sold in every state unless tagged `unavailable:<code>`
 * (e.g. `unavailable:wa`). Only the exceptions are tagged.
 *
 * Search & Discovery can only require a tag, never exclude one, so a Shopify Flow workflow
 * derives `avail:<code>` for each state the product isn't marked unavailable in. Listings filter
 * on that derived tag (Tags filter set to AND, so it narrows alongside Quick Sale). Lists without
 * filter support (predictive search, recommendations, home rails) are trimmed with
 * `availableInState`, which reads the merchant tag directly.
 */
export const unavailableTag = (code: string) => `unavailable:${code.toLowerCase()}`;
export const availabilityTag = (code: string) => `avail:${code.toLowerCase()}`;
export const stateFilter = (code: string): Record<string, unknown> => ({ tag: availabilityTag(code) });
export function availableInState(product: { tags: string[] }, code: string | null | undefined): boolean {
  if (!code) return true;
  const tag = unavailableTag(code);
  return !product.tags.some((t) => t.toLowerCase() === tag);
}

/* ------------------------------------------------------------------ client */

export interface ListingOptions {
  filters?: Record<string, unknown>[];
  sort?: SortValue;
  /** Products to show; "Load more" raises it in steps of 24. Max 250. */
  first?: number;
  buyer?: BuyerInput | null;
}

/**
 * B2B buyer for `@inContext(buyer:)`: with the company location, prices and availability come
 * from that location's catalog (the same context the cart uses). Responses that carry a buyer
 * are personalised and must not be cached for other visitors.
 */
export interface BuyerInput {
  customerAccessToken: string;
  companyLocationId?: string | null;
}

/**
 * Wraps a client so a stale or rejected customer token can't take a page down: a query sent with
 * a `buyer` variable that fails is retried once without it (public pricing) and logged.
 */
export function withBuyerFallback(storefrontClient: StorefrontClient): StorefrontClient {
  return {
    async request<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(query: string, variables?: TVariables, init?: RequestInit) {
      try {
        return await storefrontClient.request<TData, TVariables>(query, variables, init);
      } catch (err) {
        if (!variables?.buyer) throw err;
        console.warn("Storefront query with buyer context failed; retrying without it", err);
        return storefrontClient.request<TData, TVariables>(query, { ...variables, buyer: null }, init);
      }
    },
  };
}

export function createCommerceQueries(client: StorefrontClient) {
  return {
    async getCollectionListing(handle: string, opts: ListingOptions = {}): Promise<CollectionListing | null> {
      const { sortKey, reverse } = sortFor(opts.sort, "collection");
      const data = await client.request<{
        collection:
          | (Omit<CollectionListing["collection"], never> & {
              products: { filters: RawFilter[]; nodes: RawTile[]; pageInfo: ProductListing["pageInfo"] };
            })
          | null;
      }>(COLLECTION_LISTING_QUERY, {
        handle,
        first: Math.min(opts.first ?? 24, 250),
        after: null,
        filters: opts.filters?.length ? opts.filters : null,
        sortKey,
        reverse,
        buyer: opts.buyer ?? null,
      });
      if (!data.collection) return null;
      const { products, ...collection } = data.collection;
      const filters = mapFilters(products.filters);
      return {
        collection,
        products: products.nodes.map(mapTile),
        filters,
        pageInfo: products.pageInfo,
        totalCount: totalFromFilters(filters),
      };
    },

    async searchProducts(query: string, opts: ListingOptions = {}): Promise<ProductListing> {
      const { sortKey, reverse } = sortFor(opts.sort, "search");
      const data = await client.request<{
        search: { totalCount: number; productFilters: RawFilter[]; nodes: (RawTile | Record<string, never>)[]; pageInfo: ProductListing["pageInfo"] };
      }>(SEARCH_PRODUCTS_QUERY, {
        query,
        first: Math.min(opts.first ?? 24, 250),
        after: null,
        productFilters: opts.filters?.length ? opts.filters : null,
        sortKey,
        reverse,
        buyer: opts.buyer ?? null,
      });
      return {
        products: data.search.nodes.filter((n): n is RawTile => "id" in n).map(mapTile),
        filters: mapFilters(data.search.productFilters),
        pageInfo: data.search.pageInfo,
        totalCount: data.search.totalCount,
      };
    },

    async predictiveSearch(query: string, buyer?: BuyerInput | null): Promise<PredictiveResults> {
      const data = await client.request<{
        predictiveSearch: { queries: { text: string }[]; collections: { handle: string; title: string }[]; products: RawTile[] } | null;
      }>(PREDICTIVE_SEARCH_QUERY, { query, buyer: buyer ?? null });
      const r = data.predictiveSearch;
      return {
        queries: r?.queries.map((q) => q.text) ?? [],
        collections: r?.collections ?? [],
        products: r?.products.map(mapTile) ?? [],
      };
    },

    async countSearchResults(query: string, buyer?: BuyerInput | null, filters?: Record<string, unknown>[]): Promise<number> {
      const data = await client.request<{ search: { totalCount: number } }>(SEARCH_COUNT_QUERY, {
        query,
        productFilters: filters?.length ? filters : null,
        buyer: buyer ?? null,
      });
      return data.search.totalCount;
    },

    async getProductRecommendations(productId: string, limit = 4, buyer?: BuyerInput | null): Promise<TileProduct[]> {
      const data = await client.request<{ productRecommendations: RawTile[] | null }>(PRODUCT_RECOMMENDATIONS_QUERY, { productId, buyer: buyer ?? null });
      return (data.productRecommendations ?? []).slice(0, limit).map(mapTile);
    },

    async getPopularProducts(first = 4, buyer?: BuyerInput | null): Promise<TileProduct[]> {
      const data = await client.request<{ products: { nodes: RawTile[] } }>(POPULAR_PRODUCTS_QUERY, { first, buyer: buyer ?? null });
      return data.products.nodes.map(mapTile);
    },

    async getProductPage(handle: string, buyer?: BuyerInput | null): Promise<ProductPageData | null> {
      const data = await client.request<{ product: RawPage | null }>(PRODUCT_PAGE_QUERY, { handle, buyer: buyer ?? null });
      const p = data.product;
      if (!p) return null;
      const specs: Record<string, string> = {};
      for (const m of p.specs) if (m?.value) specs[m.key] = m.value;
      return {
        ...mapTile(p),
        descriptionHtml: p.descriptionHtml,
        images: p.images.nodes,
        options: p.options.map((o) => ({ name: o.name, values: o.optionValues.map((v) => v.name) })),
        collections: p.collections.nodes,
        specs,
        allVariants: p.allVariants.nodes,
      };
    },
  };
}
