import { NextRequest, NextResponse } from "next/server";
import { buildLogoutUrl } from "@repo/shopify-customer";
import { oauthConfig } from "../../../../lib/shopify";

/**
 * Opt-in Shopify logout for the "wrong brand" access-denied page. Deliberately not
 * automatic: RP-Initiated Logout clears the session for the whole Shopify identity, which
 * would otherwise silently sign the customer out of a different, currently-valid session
 * on whichever brand this account actually belongs to. Only runs when the customer
 * explicitly asks to sign out and try a different account.
 */
export async function POST(request: NextRequest) {
  const idToken = request.cookies.get("shuto_pending_logout_id_token")?.value;

  if (!idToken) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin), 303);
  }

  const postLogoutRedirectUri = new URL("/", request.nextUrl.origin).toString();
  const logoutUrl = buildLogoutUrl(oauthConfig, { idToken, postLogoutRedirectUri });

  const res = NextResponse.redirect(logoutUrl, 303);
  res.cookies.delete("shuto_pending_logout_id_token");
  return res;
}
