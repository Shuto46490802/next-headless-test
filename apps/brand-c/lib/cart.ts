import { cookies } from "next/headers";
import {
  USE_POINTS_ATTRIBUTE,
  type Cart,
  type CartBuyerIdentityInput,
  type CartLineInput,
} from "@repo/shopify-storefront";
import { storefront } from "./shopify";
import { getSession } from "./session";

export const CART_COOKIE = "shuto_cart_id";
const CART_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

/**
 * Buyer identity for the current shopper. Attaching the Customer Account API token to the
 * cart is what lets Cart & Checkout Validation functions see `buyerIdentity.customer`
 * (metafields, tags) and lets checkout recognise the login.
 */
async function currentBuyerIdentity(): Promise<CartBuyerIdentityInput | undefined> {
  const session = await getSession();
  return session ? { customerAccessToken: session.tokens.accessToken } : undefined;
}

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

/**
 * Called at login. Associates an anonymous cart with the customer who just signed in.
 * Returns `false` when the cart cookie should be dropped instead: the cart is gone, or it
 * already belongs to a different customer (e.g. someone signed out without the cart cookie
 * being cleared) — reassigning it would hand one shopper another shopper's items.
 * Never throws: a stale cart shouldn't break login, and `addLines` re-attaches lazily.
 */
export async function attachCustomerToCart(
  cartId: string,
  customerAccessToken: string,
  customerId: string,
): Promise<boolean> {
  try {
    const cart = await storefront.getCart(cartId);
    if (!cart) return false;
    if (cart.buyerIdentity.customer && cart.buyerIdentity.customer.id !== customerId) return false;
    if (!cart.buyerIdentity.customer) {
      await storefront.updateCartBuyerIdentity(cartId, { customerAccessToken });
    }
    return true;
  } catch (err) {
    console.warn("Failed to attach customer to cart", err);
    return true;
  }
}

/**
 * Adds lines to the shopper's cart, creating one only when the cookie is missing or points
 * at a cart Shopify no longer has. Mutation rejections — including validation function
 * errors (VALIDATION_CUSTOM) — propagate as CartMutationError so the caller can show them.
 */
async function addLines(lines: CartLineInput[]): Promise<Cart> {
  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value;
  const buyerIdentity = await currentBuyerIdentity();

  const existing = cartId ? await storefront.getCart(cartId) : null;
  if (existing) {
    if (buyerIdentity && !existing.buyerIdentity.customer) {
      await storefront.updateCartBuyerIdentity(existing.id, buyerIdentity);
    }
    return storefront.addCartLines(existing.id, lines);
  }

  const cart = await storefront.createCart(lines, buyerIdentity);
  store.set(CART_COOKIE, cart.id, CART_COOKIE_OPTS);
  return cart;
}

/**
 * Adds a line. With `usePoints`, the line carries `_use_points=true` so the checkout discount
 * function treats it as a points line. Cash lines carry no attribute at all — never "false".
 */
export async function addToCart(merchandiseId: string, quantity = 1, usePoints = false): Promise<Cart> {
  return addLines([
    usePoints
      ? { merchandiseId, quantity, attributes: [{ key: USE_POINTS_ATTRIBUTE, value: "true" }] }
      : { merchandiseId, quantity },
  ]);
}

export async function updateCartLine(lineId: string, quantity: number): Promise<Cart | null> {
  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value;
  if (!cartId) return null;
  return storefront.updateCartLines(cartId, [{ id: lineId, quantity }]);
}

/**
 * Switches a line between points and cash by replacing its attributes. Other attributes on
 * the line are preserved; `_use_points` is added or dropped.
 */
export async function setLinePayment(lineId: string, usePoints: boolean): Promise<Cart | null> {
  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value;
  if (!cartId) return null;
  const cart = await storefront.getCart(cartId);
  const line = cart?.lines.find((l) => l.id === lineId);
  if (!cart || !line) return cart;
  const others = line.attributes.filter((a) => a.key !== USE_POINTS_ATTRIBUTE);
  const attributes = usePoints ? [...others, { key: USE_POINTS_ATTRIBUTE, value: "true" }] : others;
  return storefront.updateCartLines(cart.id, [{ id: lineId, attributes }]);
}

export async function removeCartLine(lineId: string): Promise<Cart | null> {
  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value;
  if (!cartId) return null;
  return storefront.removeCartLines(cartId, [lineId]);
}
