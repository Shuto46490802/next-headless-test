import { NextRequest, NextResponse } from "next/server";
import { decodeIdToken, exchangeCodeForToken } from "@repo/shopify-customer";
import { BRAND_SLUG, customerAccount, customerData, oauthConfig } from "../../../../lib/shopify";
import { setSessionCookie } from "../../../../lib/session";

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
  const returnTo = request.cookies.get("shuto_oauth_return_to")?.value ?? "/account";

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
      return clearOauthCookies(
        NextResponse.redirect(
          new URL("/access-denied?reason=wrong_brand", request.nextUrl.origin),
        ),
      );
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
