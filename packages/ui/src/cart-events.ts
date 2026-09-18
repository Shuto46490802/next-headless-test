/**
 * Browser-side bridge between anything that mutates the cart (add-to-cart form, mini cart
 * rows) and the mini cart drawer in the header. Server actions return the fresh cart; the
 * caller announces it here so the drawer updates without a full page refresh.
 */
export interface MiniCartLine {
  id: string;
  quantity: number;
  /** True when the line carries `_use_points=true` (Drinks Cart). */
  usePoints?: boolean;
  cost: { totalAmount: { amount: string; currencyCode: string } };
  merchandise: {
    title: string;
    image: { url: string; altText: string | null } | null;
    product: { handle: string; title: string; pointsCost?: number | null };
    selectedOptions: { name: string; value: string }[];
  };
}

export interface MiniCartData {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: { amount: string; currencyCode: string } };
  lines: MiniCartLine[];
}

export type CartActionResult = { ok: true; cart: MiniCartData | null } | { ok: false; message: string };

export const CART_UPDATED_EVENT = "shuto:cart-updated";
export const CART_OPEN_EVENT = "shuto:cart-open";

export function announceCart(cart: MiniCartData | null, open = false) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: cart }));
  if (open) window.dispatchEvent(new Event(CART_OPEN_EVENT));
}

export function openMiniCart() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_OPEN_EVENT));
}

/** Sum of points_cost × quantity over points lines — mirrors the checkout discount function. */
export function cartPoints(cart: MiniCartData | null): number {
  if (!cart) return 0;
  return cart.lines.reduce((sum, l) => {
    const cost = l.merchandise.product.pointsCost;
    return l.usePoints && cost != null ? sum + cost * l.quantity : sum;
  }, 0);
}
