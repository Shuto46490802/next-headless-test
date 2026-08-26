import { NextRequest, NextResponse } from "next/server";
import { buildLogoutUrl } from "@repo/shopify-customer";
import { oauthConfig } from "../../../../lib/shopify";
import { clearSessionCookie, getSession } from "../../../../lib/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  await clearSessionCookie();

  if (!session || !session.tokens.idToken) {
    // No id_token to hand Shopify (e.g. a stale pre-fix session) — our own cookie is
    // already cleared above, so just send them home instead of building a broken
    // logout URL with id_token_hint=undefined.
    return NextResponse.redirect(new URL("/", request.nextUrl.origin), 303);
  }

  const postLogoutRedirectUri = new URL("/", request.nextUrl.origin).toString();
  const logoutUrl = buildLogoutUrl(oauthConfig, {
    idToken: session.tokens.idToken,
    postLogoutRedirectUri,
  });
  return NextResponse.redirect(logoutUrl, 303);
}
