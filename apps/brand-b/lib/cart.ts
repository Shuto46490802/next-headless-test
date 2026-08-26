import { cookies } from "next/headers";
import type { Cart } from "@repo/shopify-storefront";
import { storefront } from "./shopify";

const CART_COOKIE = "shuto_cart_id";
const CART_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function getCart(): Promise<Cart | null> {
  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value;
  if (!cartId) return null;
  try {
    return await storefront.getCart(cartId);
  } catch {
    return null;
  }
}

async function addLines(lines: { merchandiseId: string; quantity: number }[]): Promise<Cart> {
  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value;
  if (cartId) {
    try {
      return await storefront.addCartLines(cartId, lines);
    } catch {
      // cart may have expired/been deleted — fall through to create a new one
    }
  }
  const cart = await storefront.createCart(lines);
  store.set(CART_COOKIE, cart.id, CART_COOKIE_OPTS);
  return cart;
}

export async function addToCart(merchandiseId: string, quantity = 1): Promise<Cart> {
  return addLines([{ merchandiseId, quantity }]);
}

export async function updateCartLine(lineId: string, quantity: number): Promise<Cart | null> {
  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value;
  if (!cartId) return null;
  return storefront.updateCartLines(cartId, [{ id: lineId, quantity }]);
}

export async function removeCartLine(lineId: string): Promise<Cart | null> {
  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value;
  if (!cartId) return null;
  return storefront.removeCartLines(cartId, [lineId]);
}
