"use server";

import { CartMutationError } from "@repo/shopify-storefront";
import type { CartActionResult } from "@repo/ui";
import { removeCartLine, updateCartLine } from "../lib/cart";

function failure(err: unknown, fallback: string): CartActionResult {
  // Validation function rejections (quantity caps, licence rules) arrive as CartMutationError
  // with Shopify's message; anything else gets a generic fallback.
  if (err instanceof CartMutationError) return { ok: false, message: err.message };
  console.error(fallback, err);
  return { ok: false, message: fallback };
}

export async function updateCartLineAction(lineId: string, quantity: number): Promise<CartActionResult> {
  try {
    return { ok: true, cart: await updateCartLine(lineId, quantity) };
  } catch (err) {
    return failure(err, "Couldn't update the quantity.");
  }
}

export async function removeCartLineAction(lineId: string): Promise<CartActionResult> {
  try {
    return { ok: true, cart: await removeCartLine(lineId) };
  } catch (err) {
    return failure(err, "Couldn't remove the item.");
  }
}
