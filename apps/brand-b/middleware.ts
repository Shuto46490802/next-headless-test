import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  decryptSession,
  encryptSession,
  refreshAccessToken,
} from "@repo/shopify-customer";
import { oauthConfig } from "./lib/shopify";

const SESSION_SECRET = process.env.SESSION_SECRET as string;

export async function middleware(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = raw ? await decryptSession(raw, SESSION_SECRET) : null;

  if (!session) {
    // The OAuth callback sets this right before bouncing through Shopify's logout
    // endpoint to reject a wrong-brand login — post_logout_redirect_uri has to be the
    // bare registered origin, so the actual reason travels via cookie instead of a
    // query string and gets picked up here once Shopify redirects back to it.
    const postLogoutReason = request.cookies.get("shuto_post_logout_reason")?.value;
    if (postLogoutReason) {
      const res = NextResponse.redirect(
        new URL(`/access-denied?reason=${postLogoutReason}`, request.nextUrl.origin),
      );
      res.cookies.delete("shuto_post_logout_reason");
      return res;
    }

    const gateUrl = new URL("/gate", request.nextUrl.origin);
    gateUrl.searchParams.set("returnTo", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(gateUrl);
  }

  const isExpiringSoon = session.tokens.expiresAt - Date.now() < 60_000;
  if (!isExpiringSoon || !session.tokens.refreshToken) return NextResponse.next();

  try {
    const refreshed = await refreshAccessToken(oauthConfig, session.tokens.refreshToken);
    // Shopify's refresh_token grant doesn't return a new id_token, and may not return a
    // new refresh_token either if it isn't rotating — fall back to the prior session's
    // values so logout's id_token_hint and future refreshes keep working.
    const tokens = {
      ...refreshed,
      idToken: refreshed.idToken || session.tokens.idToken,
      refreshToken: refreshed.refreshToken || session.tokens.refreshToken,
    };
    const token = await encryptSession({ ...session, tokens }, SESSION_SECRET);
    const res = NextResponse.next();
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch {
    // Refresh failed (e.g. this is a public-client id that never receives a refresh
    // token) — let the page render with the stale token; requireSession/API calls will
    // surface the real auth error and send the customer back through login.
    return NextResponse.next();
  }
}

export const config = {
  // Everything requires a session except: the gate/access-denied pages themselves
  // (or this would redirect-loop), all /api routes (they do their own auth checks and
  // must return JSON/redirects to Shopify, not an HTML gate page), and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|gate|access-denied).*)"],
};
