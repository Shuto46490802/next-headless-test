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
    const gateUrl = new URL("/gate", request.nextUrl.origin);
    gateUrl.searchParams.set("returnTo", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(gateUrl);
  }

  const isExpiringSoon = session.tokens.expiresAt - Date.now() < 60_000;
  if (!isExpiringSoon || !session.tokens.refreshToken) return NextResponse.next();

  try {
    const refreshed = await refreshAccessToken(oauthConfig, session.tokens.refreshToken);
    const token = await encryptSession({ ...session, tokens: refreshed }, SESSION_SECRET);
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
