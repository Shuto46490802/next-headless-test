import { createStorefrontClient, type StorefrontConfig } from "./client";
import {
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
  CollectionSummary,
  CollectionWithProducts,
  ProductDetail,
  ProductSummary,
} from "./types";

export * from "./types";
export { StorefrontApiError } from "./client";

interface RawProductDetail extends ProductSummary {
  descriptionHtml: string;
  images: { nodes: ProductDetail["images"] };
  options: ProductDetail["options"];
  variants: { nodes: ProductDetail["variants"] };
}

interface RawCollection extends CollectionSummary {
  products: {
    nodes: ProductSummary[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

type RawCart = Omit<Cart, "lines"> & { lines: { nodes: Cart["lines"] } };

function mapCart(raw: RawCart): Cart {
  const { lines, ...rest } = raw;
  return { ...rest, lines: lines.nodes };
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
      const { images, variants, ...rest } = data.product;
      return { ...rest, images: images.nodes, variants: variants.nodes };
    },

    async listProducts(
      opts: { first?: number; after?: string } = {},
    ): Promise<{ items: ProductSummary[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }> {
      const data = await client.request<{
        products: { nodes: ProductSummary[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
      }>(PRODUCTS_QUERY, { first: opts.first ?? 24, after: opts.after ?? null });
      return { items: data.products.nodes, pageInfo: data.products.pageInfo };
    },

    async getProductsByIds(ids: string[]): Promise<ProductSummary[]> {
      if (ids.length === 0) return [];
      const data = await client.request<{ nodes: (ProductSummary | null)[] }>(
        PRODUCTS_BY_IDS_QUERY,
        { ids },
      );
      return data.nodes.filter((n): n is ProductSummary => n !== null);
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
      return { ...rest, products: { items: products.nodes, pageInfo: products.pageInfo } };
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

    async createCart(lines: { merchandiseId: string; quantity: number }[]): Promise<Cart> {
      const data = await client.request<{
        cartCreate: { cart: RawCart; userErrors: { field: string[]; message: string }[] };
      }>(CART_CREATE_MUTATION, { lines });
      if (data.cartCreate.userErrors.length > 0) {
        throw new Error(data.cartCreate.userErrors.map((e) => e.message).join(", "));
      }
      return mapCart(data.cartCreate.cart);
    },

    async addCartLines(
      cartId: string,
      lines: { merchandiseId: string; quantity: number }[],
    ): Promise<Cart> {
      const data = await client.request<{
        cartLinesAdd: { cart: RawCart; userErrors: { field: string[]; message: string }[] };
      }>(CART_LINES_ADD_MUTATION, { cartId, lines });
      if (data.cartLinesAdd.userErrors.length > 0) {
        throw new Error(data.cartLinesAdd.userErrors.map((e) => e.message).join(", "));
      }
      return mapCart(data.cartLinesAdd.cart);
    },

    async updateCartLines(
      cartId: string,
      lines: { id: string; quantity: number }[],
    ): Promise<Cart> {
      const data = await client.request<{
        cartLinesUpdate: { cart: RawCart; userErrors: { field: string[]; message: string }[] };
      }>(CART_LINES_UPDATE_MUTATION, { cartId, lines });
      if (data.cartLinesUpdate.userErrors.length > 0) {
        throw new Error(data.cartLinesUpdate.userErrors.map((e) => e.message).join(", "));
      }
      return mapCart(data.cartLinesUpdate.cart);
    },

    async removeCartLines(cartId: string, lineIds: string[]): Promise<Cart> {
      const data = await client.request<{
        cartLinesRemove: { cart: RawCart; userErrors: { field: string[]; message: string }[] };
      }>(CART_LINES_REMOVE_MUTATION, { cartId, lineIds });
      if (data.cartLinesRemove.userErrors.length > 0) {
        throw new Error(data.cartLinesRemove.userErrors.map((e) => e.message).join(", "));
      }
      return mapCart(data.cartLinesRemove.cart);
    },
  };
}

export type ShopifyStorefront = ReturnType<typeof createShopifyStorefront>;
