"use server";

import { CartMutationError } from "@repo/shopify-storefront";
import type { AddToCartResult } from "@repo/ui";
import { addToCart } from "../lib/cart";

/** Add to cart from a product tile or the PDP. Validation function rejections come back as the message. */
export async function addToCartAction(variantId: string, quantity: number): Promise<AddToCartResult> {
  try {
    const cart = await addToCart(variantId, quantity);
    return { ok: true, cart };
  } catch (err) {
    if (!(err instanceof CartMutationError)) console.error("addToCartAction failed", err);
    return { ok: false, message: err instanceof CartMutationError ? err.message : "Couldn't add to cart. Please try again." };
  }
}
