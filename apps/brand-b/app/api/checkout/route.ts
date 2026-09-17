import { NextRequest, NextResponse } from "next/server";
import { CART_COOKIE, applyBuyerIdentity, buyerIdentityFor } from "../../../lib/cart";
import { getSession } from "../../../lib/session";
import { storefront } from "../../../lib/shopify";

/**
 * Hands the shopper to Shopify checkout. Before redirecting, make sure the cart carries the
 * session's buyer identity — customer token plus company location for B2B contacts — so
 * checkout shows the company "Shopping for" block. If the company location can't be applied,
 * the cart is left personal (logged) and checkout still proceeds.
 */
export async function GET(request: NextRequest) {
  const cartId = request.cookies.get(CART_COOKIE)?.value;
  const cart = cartId ? await storefront.getCart(cartId).catch(() => null) : null;
  if (!cart || cart.lines.length === 0) {
    return NextResponse.redirect(new URL("/cart", request.nextUrl.origin), 303);
  }

  const session = await getSession();
  let target = cart;
  if (session) {
    try {
      target = await applyBuyerIdentity(cart, buyerIdentityFor(session));
    } catch (err) {
      console.error("Failed to apply buyer identity before checkout", err);
    }
    if (session.companyLocationId && !target.buyerIdentity.purchasingCompany) {
      console.warn(
        `Checkout for cart ${target.id}: customer ${session.customerId} is not a contact of location ${session.companyLocationId}; proceeding with a personal cart`,
      );
    }
  }

  return NextResponse.redirect(target.checkoutUrl, 303);
}
