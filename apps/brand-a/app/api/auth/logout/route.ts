import { NextRequest, NextResponse } from "next/server";
import { buildLogoutUrl } from "@repo/shopify-customer";
import { oauthConfig } from "../../../../lib/shopify";
import { clearSessionCookie, getSession } from "../../../../lib/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  await clearSessionCookie();

  if (!session) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin), 303);
  }

  const postLogoutRedirectUri = new URL("/", request.nextUrl.origin).toString();
  const logoutUrl = buildLogoutUrl(oauthConfig, {
    idToken: session.tokens.idToken,
    postLogoutRedirectUri,
  });
  return NextResponse.redirect(logoutUrl, 303);
}
