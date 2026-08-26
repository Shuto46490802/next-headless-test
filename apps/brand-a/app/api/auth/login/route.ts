import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
  generateState,
} from "@repo/shopify-customer";
import { oauthConfig } from "../../../../lib/shopify";
import { safeReturnTo } from "../../../../lib/safe-return-to";

const PKCE_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
};

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"), "/account");
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();
  const nonce = generateNonce();
  const redirectUri = new URL("/api/auth/callback", request.nextUrl.origin).toString();

  const authorizeUrl = buildAuthorizeUrl(oauthConfig, {
    redirectUri,
    state,
    nonce,
    codeChallenge,
  });

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set("shuto_oauth_verifier", codeVerifier, PKCE_COOKIE_OPTS);
  res.cookies.set("shuto_oauth_state", state, PKCE_COOKIE_OPTS);
  res.cookies.set("shuto_oauth_nonce", nonce, PKCE_COOKIE_OPTS);
  res.cookies.set("shuto_oauth_return_to", returnTo, PKCE_COOKIE_OPTS);
  return res;
}
