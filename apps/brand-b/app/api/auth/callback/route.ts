import { NextRequest, NextResponse } from "next/server";
import { decodeIdToken, exchangeCodeForToken } from "@repo/shopify-customer";
import { SITE_MEMBERSHIP, customerAccount, customerData, oauthConfig } from "../../../../lib/shopify";
import { setSessionCookie } from "../../../../lib/session";
import { CART_COOKIE, attachCustomerToCart } from "../../../../lib/cart";
import { safeReturnTo } from "../../../../lib/safe-return-to";

function clearOauthCookies(res: NextResponse) {
  for (const name of [
    "shuto_oauth_verifier",
    "shuto_oauth_state",
    "shuto_oauth_nonce",
    "shuto_oauth_return_to",
  ]) {
    res.cookies.delete(name);
  }
  return res;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  const expectedState = request.cookies.get("shuto_oauth_state")?.value;
  const expectedNonce = request.cookies.get("shuto_oauth_nonce")?.value;
  const codeVerifier = request.cookies.get("shuto_oauth_verifier")?.value;
  const returnTo = safeReturnTo(request.cookies.get("shuto_oauth_return_to")?.value, "/account");

  if (error || !code || !state || !codeVerifier || state !== expectedState) {
    return clearOauthCookies(
      NextResponse.redirect(
        new URL("/access-denied?reason=auth_failed", request.nextUrl.origin),
      ),
    );
  }

  try {
    const redirectUri = new URL("/api/auth/callback", request.nextUrl.origin).toString();
    const tokens = await exchangeCodeForToken(oauthConfig, { code, codeVerifier, redirectUri });

    const claims = decodeIdToken(tokens.idToken);
    if (expectedNonce && claims.nonce !== expectedNonce) {
      return clearOauthCookies(
        NextResponse.redirect(
          new URL("/access-denied?reason=auth_failed", request.nextUrl.origin),
        ),
      );
    }

    const profile = await customerAccount.getProfile(tokens.accessToken);
    const customerId = profile.id;

    const existingMembership = await customerData.getSiteMembership(customerId);
    if (existingMembership && existingMembership !== SITE_MEMBERSHIP) {
      // Don't auto-trigger a Shopify logout here: RP-Initiated Logout terminates the
      // session for the whole identity, not just this brand — it would silently kill an
      // already-valid, currently-in-use session on whichever site this account's
      // membership actually belongs to. Instead, stash the id_token and let the customer opt into that
      // themselves from the access-denied page ("sign out and try again"), via
      // /api/auth/logout-pending.
      const res = NextResponse.redirect(
        new URL("/access-denied?reason=wrong_membership", request.nextUrl.origin),
      );
      res.cookies.set("shuto_pending_logout_id_token", tokens.idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 300,
      });
      return clearOauthCookies(res);
    }
    if (!existingMembership) {
      // First login anywhere claims the account for this site.
      await customerData.setSiteMembership(customerId, SITE_MEMBERSHIP);
    }

    // Best-effort: mark the account as having signed in (drives Registered/Pending on the
    // partner Users page). Never block login on it.
    try {
      await customerData.recordLogin(customerId);
    } catch (err) {
      console.warn("Failed to record login", err);
    }

    // B2B: default every cart to the contact's first company location so checkout shows
    // company features. Non-B2B customers get null and shop with a personal cart.
    let companyLocationId: string | null = null;
    try {
      companyLocationId = (await customerAccount.getDefaultCompanyLocation(tokens.accessToken))?.locationId ?? null;
    } catch (err) {
      console.warn("Failed to load default company location", err);
    }

    const session = {
      customerId,
      email: profile.emailAddress?.emailAddress ?? null,
      tokens,
      companyLocationId,
    };
    await setSessionCookie(session);

    // Tie any cart started while logged out to this customer (and company location), so
    // validation functions and checkout see the buyer identity. If the cart already belongs
    // to someone else, start this customer on a fresh cart rather than handing them the
    // previous shopper's items.
    const cartId = request.cookies.get(CART_COOKIE)?.value;
    const keepCart = cartId ? await attachCustomerToCart(cartId, session) : false;

    const res = NextResponse.redirect(new URL(returnTo, request.nextUrl.origin));
    if (cartId && !keepCart) res.cookies.delete(CART_COOKIE);
    return clearOauthCookies(res);
  } catch (err) {
    console.error("OAuth callback failed", err);
    return clearOauthCookies(
      NextResponse.redirect(
        new URL("/access-denied?reason=auth_failed", request.nextUrl.origin),
      ),
    );
  }
}
