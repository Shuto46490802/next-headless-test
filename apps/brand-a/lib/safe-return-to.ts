/**
 * `returnTo` travels through a query param and a cookie before being used in a redirect —
 * without validation that's an open-redirect hole (e.g. /api/auth/login?returnTo=https://evil.com).
 * Only ever allow same-origin relative paths.
 */
export function safeReturnTo(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
