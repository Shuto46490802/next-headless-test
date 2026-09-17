import { cookies } from "next/headers";
import { CartMutationError, type Cart, type CartBuyerIdentityInput } from "@repo/shopify-storefront";
import type { SessionPayload } from "@repo/shopify-customer";
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
 * Buyer identity for a session. The Customer Account token lets validation functions see
 * `buyerIdentity.customer` and lets checkout recognise the login; the company location (B2B
 * only) is what makes checkout show company features such as the "Shopping for" block.
 */
export function buyerIdentityFor(session: SessionPayload): CartBuyerIdentityInput {
  return session.companyLocationId
    ? { customerAccessToken: session.tokens.accessToken, companyLocationId: session.companyLocationId }
    : { customerAccessToken: session.tokens.accessToken };
}

async function currentBuyerIdentity(): Promise<CartBuyerIdentityInput | undefined> {
  const session = await getSession();
  return session ? buyerIdentityFor(session) : undefined;
}

/** True when the cart already reflects this identity (customer attached, and the company location if one is expected). */
function cartMatches(cart: Cart, identity: CartBuyerIdentityInput): boolean {
  if (!cart.buyerIdentity.customer) return false;
  if (!identity.companyLocationId) return true;
  return cart.buyerIdentity.purchasingCompany?.location.id === identity.companyLocationId;
}

/**
 * Applies the identity to a cart. If Shopify refuses the company location (the token isn't a
 * contact of it) or accepts it without producing a purchasing company, fall back to a
 * personal cart and log it — the shopper can still check out, just without company features.
 */
export async function applyBuyerIdentity(cart: Cart, identity: CartBuyerIdentityInput): Promise<Cart> {
  if (cartMatches(cart, identity)) return cart;
  if (identity.companyLocationId) {
    try {
      const updated = await storefront.updateCartBuyerIdentity(cart.id, identity);
      if (updated.buyerIdentity.purchasingCompany) return updated;
      console.warn(
        `Company location ${identity.companyLocationId} accepted but cart ${cart.id} has no purchasingCompany — falling back to a personal cart`,
      );
    } catch (err) {
      if (!(err instanceof CartMutationError)) throw err;
      console.warn(
        `Company location ${identity.companyLocationId} rejected for cart ${cart.id} (${err.message}) — falling back to a personal cart`,
      );
    }
  }
  const personal: CartBuyerIdentityInput = { customerAccessToken: identity.customerAccessToken };
  return cart.buyerIdentity.customer ? cart : storefront.updateCartBuyerIdentity(cart.id, personal);
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
 * Called at login. Associates an anonymous cart with the customer who just signed in (and
 * their company location). Returns `false` when the cart cookie should be dropped instead:
 * the cart is gone, or it already belongs to a different customer — reassigning it would hand
 * one shopper another shopper's items. Never throws: a stale cart shouldn't break login.
 */
export async function attachCustomerToCart(cartId: string, session: SessionPayload): Promise<boolean> {
  try {
    const cart = await storefront.getCart(cartId);
    if (!cart) return false;
    if (cart.buyerIdentity.customer && cart.buyerIdentity.customer.id !== session.customerId) return false;
    await applyBuyerIdentity(cart, buyerIdentityFor(session));
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
async function addLines(lines: { merchandiseId: string; quantity: number }[]): Promise<Cart> {
  const store = await cookies();
  const cartId = store.get(CART_COOKIE)?.value;
  const buyerIdentity = await currentBuyerIdentity();

  const existing = cartId ? await storefront.getCart(cartId) : null;
  if (existing) {
    if (buyerIdentity) await applyBuyerIdentity(existing, buyerIdentity);
    return storefront.addCartLines(existing.id, lines);
  }

  let cart: Cart;
  try {
    cart = await storefront.createCart(lines, buyerIdentity);
  } catch (err) {
    // A rejected company location shouldn't block the first add — retry as a personal cart.
    if (!(err instanceof CartMutationError) || !buyerIdentity?.companyLocationId) throw err;
    console.warn(`cartCreate with company location ${buyerIdentity.companyLocationId} rejected (${err.message}) — creating a personal cart`);
    cart = await storefront.createCart(lines, { customerAccessToken: buyerIdentity.customerAccessToken });
  }
  if (buyerIdentity?.companyLocationId && !cart.buyerIdentity.purchasingCompany) {
    console.warn(`Cart ${cart.id} created with company location ${buyerIdentity.companyLocationId} but has no purchasingCompany`);
  }
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
