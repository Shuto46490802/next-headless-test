import { NextRequest, NextResponse } from "next/server";
import { buildLogoutUrl, decodeIdToken, exchangeCodeForToken } from "@repo/shopify-customer";
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
      // Route the rejection through Shopify's own logout endpoint (using the id_token we
      // just got from the exchange, even though we're refusing to keep this session) so
      // the shopify.com SSO session clears too. Otherwise a retry with the right account
      // would silently reuse this wrong one, forcing the customer to go log out from
      // whichever brand it *does* belong to before they could try again here.
      //
      // post_logout_redirect_uri must exactly match a registered Logout URI — which is
      // registered as the bare origin, not /access-denied — so carry the reason through a
      // short-lived cookie instead of a query string; middleware reads it once we're back.
      const postLogoutRedirectUri = new URL("/", request.nextUrl.origin).toString();
      const logoutUrl = buildLogoutUrl(oauthConfig, {
        idToken: tokens.idToken,
        postLogoutRedirectUri,
      });
      const res = NextResponse.redirect(logoutUrl);
      res.cookies.set("shuto_post_logout_reason", "wrong_brand", {
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
