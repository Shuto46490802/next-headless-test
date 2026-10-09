/**
 * Asahi backend calls for Drinks Cart sign-up (Backend requirements page: "Code validation").
 * Endpoint paths and payloads are proposals to agree with the backend team.
 *
 * Without BACKEND_API_URL, outside production, a stand-in answers so the flow can be tested:
 * referral codes starting with "TEST-" are valid, and @asahi.com.au emails count as staff.
 * In production without it, nothing is auto-approved.
 */
const BASE = process.env.BACKEND_API_URL?.replace(/\/$/, "") || null;
const KEY = process.env.BACKEND_API_KEY || "";
const MOCK = !BASE && process.env.NODE_ENV !== "production";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}) },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Backend ${path} failed (${res.status})`);
  return (await res.json()) as T;
}

export type ReferralCheck = { status: "valid"; referrerCustomerId: string | null } | { status: "invalid" } | { status: "unavailable" };

/** Friends & family: is this staff referral code valid for Drinks Cart? */
export async function validateReferralCode(code: string): Promise<ReferralCheck> {
  const c = code.trim().toUpperCase();
  if (MOCK) return c.startsWith("TEST-") ? { status: "valid", referrerCustomerId: null } : { status: "invalid" };
  if (!BASE) return { status: "unavailable" };
  try {
    const r = await post<{ valid: boolean; referrerCustomerId?: string | null }>("/referral-codes/validate", { code: c, site: "DC" });
    return r.valid ? { status: "valid", referrerCustomerId: r.referrerCustomerId ?? null } : { status: "invalid" };
  } catch (err) {
    console.error("Referral code check failed", err);
    return { status: "unavailable" };
  }
}

/** Staff: is this email on the Asahi employee list? Unknown → left for manual review. */
export async function verifyStaff(email: string): Promise<boolean> {
  if (MOCK) return /@asahi\.com\.au$/i.test(email);
  if (!BASE) return false;
  try {
    return (await post<{ valid: boolean }>("/staff/verify", { email })).valid;
  } catch (err) {
    console.error("Staff check failed", err);
    return false;
  }
}
