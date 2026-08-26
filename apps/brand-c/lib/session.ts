import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, decryptSession, encryptSession, type SessionPayload } from "@repo/shopify-customer";

const SESSION_SECRET = process.env.SESSION_SECRET as string;

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  return decryptSession(raw, SESSION_SECRET);
}

export async function setSessionCookie(payload: SessionPayload) {
  const store = await cookies();
  const token = await encryptSession(payload, SESSION_SECRET);
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/**
 * Returns the session's access token. Token refresh happens in middleware.ts (the only
 * place allowed to write cookies ahead of a page render) — by the time a Server Component
 * reads the session, its access token is already fresh.
 */
export async function getValidAccessToken(session: SessionPayload): Promise<string> {
  return session.tokens.accessToken;
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/api/auth/login?returnTo=%2Faccount");
  return session;
}
