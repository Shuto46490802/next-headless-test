"use server";

import { CartMutationError } from "@repo/shopify-storefront";
import type { AddToCartResult } from "@repo/ui";
import { addToCart } from "../lib/cart";

/**
 * Add to cart from a product tile (search results). Tiles add as cash; the member can switch the
 * line to points in the mini cart. The PDP keeps its own points-aware action.
 */
export async function addToCartAction(variantId: string, quantity: number): Promise<AddToCartResult> {
  try {
    const cart = await addToCart(variantId, quantity, false);
    return { ok: true, cart };
  } catch (err) {
    if (!(err instanceof CartMutationError)) console.error("addToCartAction failed", err);
    return { ok: false, message: err instanceof CartMutationError ? err.message : "Couldn't add to cart. Please try again." };
  }
}
