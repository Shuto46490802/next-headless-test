"use server";

import { availableInState, type TileProduct } from "@repo/shopify-storefront";
import { storefront } from "../lib/shopify";
import { getBuyer } from "../lib/listing";
import { getDeliveryState } from "../lib/location";

/**
 * Mini cart "Have you forgotten": Shopify's related products for the first cart item, topped up
 * with best sellers, minus anything already in the cart or not sold in the chosen state.
 */
export async function getCartUpsell(productIdsInCart: string[]): Promise<TileProduct[]> {
  const [buyer, state] = await Promise.all([getBuyer(), getDeliveryState()]);
  const inCart = new Set(productIdsInCart);
  const related = productIdsInCart[0] ? await storefront.getProductRecommendations(productIdsInCart[0], 10, buyer).catch(() => []) : [];
  const popular = related.length < 6 ? await storefront.getPopularProducts(12, buyer).catch(() => []) : [];
  const seen = new Set<string>();
  return [...related, ...popular]
    .filter((p) => !inCart.has(p.id) && !seen.has(p.id) && seen.add(p.id) && availableInState(p, state))
    .slice(0, 6);
}
