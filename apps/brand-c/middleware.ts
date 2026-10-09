import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  accessRedirect,
  decryptSession,
  encryptSession,
  refreshAccessToken,
  resolveAccess,
  type SessionPayload,
} from "@repo/shopify-customer";
import { customerAccount, oauthConfig } from "./lib/shopify";
import { accessMode } from "./lib/brand";

const SESSION_SECRET = process.env.SESSION_SECRET as string;

/** How long a sign-up status is trusted before asking Shopify again. */
const RECHECK_APPROVED_MS = 6 * 60 * 60 * 1000;
const RECHECK_WAITING_MS = 30 * 1000;

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

/**
 * Runs before every page:
 * 1. No session: send to the landing page (/gate).
 * 2. Access token about to expire: refresh it.
 * 3. Sign-up gate: work out whether this person is approved (from `custom.account_status`, via
 *    the Customer Account API, cached in the session) and keep anyone not approved on /signup or
 *    /pending. Approved customers are sent away from those pages.
 */
export async function middleware(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = raw ? await decryptSession(raw, SESSION_SECRET) : null;

  if (!session) {
    const gateUrl = new URL("/gate", request.nextUrl.origin);
    gateUrl.searchParams.set("returnTo", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(gateUrl);
  }

  let next: SessionPayload = session;
  let changed = false;

  if (session.tokens.expiresAt - Date.now() < 60_000 && session.tokens.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(oauthConfig, session.tokens.refreshToken);
      // Shopify's refresh grant doesn't return a new id_token and may not rotate the refresh
      // token, so keep the previous values for logout and future refreshes.
      next = {
        ...next,
        tokens: {
          ...refreshed,
          idToken: refreshed.idToken || session.tokens.idToken,
          refreshToken: refreshed.refreshToken || session.tokens.refreshToken,
        },
      };
      changed = true;
    } catch {
      // Refresh failed: let the page render with the stale token; API calls will surface the
      // real auth error and send the customer back through login.
    }
  }

  const access = next.access;
  const ttl = access?.state === "approved" ? RECHECK_APPROVED_MS : RECHECK_WAITING_MS;
  if (!access || Date.now() - access.checkedAt > ttl) {
    try {
      const status = await customerAccount.getAccessStatus(next.tokens.accessToken);
      next = {
        ...next,
        access: { state: resolveAccess(status, accessMode), checkedAt: Date.now() },
        // A company created at sign-up only exists after login, so pick up its location here.
        companyLocationId: status.company?.locationId ?? next.companyLocationId ?? null,
      };
      changed = true;
    } catch (err) {
      // Keep the last known state. With none at all, let the request through rather than lock
      // everyone out during a Shopify outage; it's re-checked on the next request.
      console.warn("Sign-up status check failed", err);
    }
  }

  const target = next.access ? accessRedirect(next.access.state, request.nextUrl.pathname) : null;
  const res = target ? NextResponse.redirect(new URL(target, request.nextUrl.origin)) : NextResponse.next();
  if (changed) res.cookies.set(SESSION_COOKIE_NAME, await encryptSession(next, SESSION_SECRET), COOKIE_OPTS);
  return res;
}

export const config = {
  // Everything requires a session except: the gate/access-denied pages themselves
  // (or this would redirect-loop), all /api routes (they do their own auth checks and
  // must return JSON/redirects to Shopify, not an HTML gate page), and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|gate|access-denied|preview).*)"],
};
