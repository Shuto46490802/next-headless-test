import { createStorefrontClient, type StorefrontConfig } from "./client";
import {
  CART_BUYER_IDENTITY_UPDATE_MUTATION,
  CART_CREATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_QUERY,
  COLLECTION_QUERY,
  COLLECTIONS_QUERY,
  PRODUCT_DETAIL_QUERY,
  PRODUCTS_BY_IDS_QUERY,
  PRODUCTS_QUERY,
} from "./queries";
import type {
  Cart,
  CartBuyerIdentityInput,
  CartLine,
  CartLineInput,
  CartLineUpdateInput,
  CollectionSummary,
  CollectionWithProducts,
  ProductDetail,
  ProductSummary,
} from "./types";

export * from "./types";
export { StorefrontApiError } from "./client";
import { USE_POINTS_ATTRIBUTE } from "./types";

type RawProductSummary = Omit<ProductSummary, "pointsCost"> & { pointsCostMetafield: { value: string } | null };

interface RawProductDetail extends RawProductSummary {
  descriptionHtml: string;
  images: { nodes: ProductDetail["images"] };
  options: ProductDetail["options"];
  variants: { nodes: ProductDetail["variants"] };
}

interface RawCollection extends CollectionSummary {
  products: {
    nodes: RawProductSummary[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

type RawCartLine = Omit<CartLine, "usePoints" | "merchandise"> & {
  merchandise: Omit<CartLine["merchandise"], "product"> & {
    product: { handle: string; title: string; pointsCost: { value: string } | null };
  };
};
type RawCart = Omit<Cart, "lines"> & { lines: { nodes: RawCartLine[] } };

/** Parses an integer metafield value; anything non-numeric or non-positive is treated as absent. */
function parsePoints(raw: { value: string } | null | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw.value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function mapProductSummary(raw: RawProductSummary): ProductSummary {
  const { pointsCostMetafield, ...rest } = raw;
  return { ...rest, pointsCost: parsePoints(pointsCostMetafield) };
}

function mapCartLine(raw: RawCartLine): CartLine {
  const { merchandise, ...rest } = raw;
  const { product, ...merch } = merchandise;
  return {
    ...rest,
    usePoints: raw.attributes.some((a) => a.key === USE_POINTS_ATTRIBUTE && a.value === "true"),
    merchandise: { ...merch, product: { ...product, pointsCost: parsePoints(product.pointsCost) } },
  };
}

function mapCart(raw: RawCart): Cart {
  const { lines, ...rest } = raw;
  return { ...rest, lines: lines.nodes.map(mapCartLine) };
}

export interface CartUserError {
  field: string[] | null;
  message: string;
}

/**
 * A cart mutation completed (HTTP 200) but Shopify rejected it via `userErrors`. This is how
 * Cart & Checkout Validation function rejections (code VALIDATION_CUSTOM) reach a headless
 * storefront — `message` carries the function's localizedMessage.
 */
export class CartMutationError extends Error {
  constructor(public readonly userErrors: CartUserError[]) {
    super(userErrors.map((e) => e.message).join(", "));
    this.name = "CartMutationError";
  }
}

interface CartPayload {
  cart: RawCart | null;
  userErrors: CartUserError[];
}

function unwrapCart(payload: CartPayload): Cart {
  if (payload.userErrors.length > 0) throw new CartMutationError(payload.userErrors);
  if (!payload.cart) throw new CartMutationError([{ field: null, message: "Shopify returned no cart." }]);
  return mapCart(payload.cart);
}

export function createShopifyStorefront(config: StorefrontConfig) {
  const client = createStorefrontClient(config);

  return {
    client,

    async getProduct(handle: string): Promise<ProductDetail | null> {
      const data = await client.request<{ product: RawProductDetail | null }>(
        PRODUCT_DETAIL_QUERY,
        { handle },
      );
      if (!data.product) return null;
      const { images, variants, pointsCostMetafield, ...rest } = data.product;
      return {
        ...rest,
        pointsCost: parsePoints(pointsCostMetafield),
        images: images.nodes,
        variants: variants.nodes,
      };
    },

    async listProducts(
      opts: { first?: number; after?: string } = {},
    ): Promise<{ items: ProductSummary[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }> {
      const data = await client.request<{
        products: { nodes: RawProductSummary[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
      }>(PRODUCTS_QUERY, { first: opts.first ?? 24, after: opts.after ?? null });
      return { items: data.products.nodes.map(mapProductSummary), pageInfo: data.products.pageInfo };
    },

    async getProductsByIds(ids: string[]): Promise<ProductSummary[]> {
      if (ids.length === 0) return [];
      const data = await client.request<{ nodes: (RawProductSummary | null)[] }>(
        PRODUCTS_BY_IDS_QUERY,
        { ids },
      );
      return data.nodes.filter((n): n is RawProductSummary => n !== null).map(mapProductSummary);
    },

    async getCollection(
      handle: string,
      opts: { first?: number; after?: string } = {},
    ): Promise<CollectionWithProducts | null> {
      const data = await client.request<{ collection: RawCollection | null }>(
        COLLECTION_QUERY,
        { handle, first: opts.first ?? 24, after: opts.after ?? null },
      );
      if (!data.collection) return null;
      const { products, ...rest } = data.collection;
      return { ...rest, products: { items: products.nodes.map(mapProductSummary), pageInfo: products.pageInfo } };
    },

    async listCollections(first = 12): Promise<CollectionSummary[]> {
      const data = await client.request<{ collections: { nodes: CollectionSummary[] } }>(
        COLLECTIONS_QUERY,
        { first },
      );
      return data.collections.nodes;
    },

    async getCart(cartId: string): Promise<Cart | null> {
      const data = await client.request<{ cart: RawCart | null }>(CART_QUERY, { cartId });
      return data.cart ? mapCart(data.cart) : null;
    },

    async createCart(lines: CartLineInput[], buyerIdentity?: CartBuyerIdentityInput): Promise<Cart> {
      const data = await client.request<{ cartCreate: CartPayload }>(CART_CREATE_MUTATION, {
        lines,
        buyerIdentity: buyerIdentity ?? null,
      });
      return unwrapCart(data.cartCreate);
    },

    async updateCartBuyerIdentity(cartId: string, buyerIdentity: CartBuyerIdentityInput): Promise<Cart> {
      const data = await client.request<{ cartBuyerIdentityUpdate: CartPayload }>(
        CART_BUYER_IDENTITY_UPDATE_MUTATION,
        { cartId, buyerIdentity },
      );
      return unwrapCart(data.cartBuyerIdentityUpdate);
    },

    async addCartLines(cartId: string, lines: CartLineInput[]): Promise<Cart> {
      const data = await client.request<{ cartLinesAdd: CartPayload }>(CART_LINES_ADD_MUTATION, {
        cartId,
        lines,
      });
      return unwrapCart(data.cartLinesAdd);
    },

    async updateCartLines(cartId: string, lines: CartLineUpdateInput[]): Promise<Cart> {
      const data = await client.request<{ cartLinesUpdate: CartPayload }>(CART_LINES_UPDATE_MUTATION, {
        cartId,
        lines,
      });
      return unwrapCart(data.cartLinesUpdate);
    },

    async removeCartLines(cartId: string, lineIds: string[]): Promise<Cart> {
      const data = await client.request<{ cartLinesRemove: CartPayload }>(CART_LINES_REMOVE_MUTATION, {
        cartId,
        lineIds,
      });
      return unwrapCart(data.cartLinesRemove);
    },
  };
}

export type ShopifyStorefront = ReturnType<typeof createShopifyStorefront>;
