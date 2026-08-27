import { NextRequest, NextResponse } from "next/server";
import { decodeIdToken, exchangeCodeForToken } from "@repo/shopify-customer";
import { BRAND_SLUG, customerAccount, customerData, oauthConfig } from "../../../../lib/shopify";
import { setSessionCookie } from "../../../../lib/session";
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

    const existingBrand = await customerData.getBrand(customerId);
    if (existingBrand && existingBrand !== BRAND_SLUG) {
      // Don't auto-trigger a Shopify logout here: RP-Initiated Logout terminates the
      // session for the whole identity, not just this brand — it would silently kill an
      // already-valid, currently-in-use session on whichever brand this account actually
      // belongs to. Instead, stash the id_token and let the customer opt into that
      // themselves from the access-denied page ("sign out and try again"), via
      // /api/auth/logout-pending.
      const res = NextResponse.redirect(
        new URL("/access-denied?reason=wrong_brand", request.nextUrl.origin),
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
    if (!existingBrand) {
      await customerData.setBrand(customerId, BRAND_SLUG);
    }

    await setSessionCookie({
      customerId,
      email: profile.emailAddress?.emailAddress ?? null,
      tokens,
    });

    return clearOauthCookies(NextResponse.redirect(new URL(returnTo, request.nextUrl.origin)));
  } catch (err) {
    console.error("OAuth callback failed", err);
    return clearOauthCookies(
      NextResponse.redirect(
        new URL("/access-denied?reason=auth_failed", request.nextUrl.origin),
      ),
    );
  }
}
