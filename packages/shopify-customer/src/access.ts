import type { AccessStatus } from "./types";
import type { AccessState } from "./session";

/**
 * Turns `custom.account_status` into the gate state.
 *
 * - `company` (Club Connect, Partner Connect): the club or partner is what Asahi approves. No
 *   company yet means the person still has to sign up. A company with no status at all was set
 *   up directly by Asahi (or migrated) rather than through sign-up, so it counts as approved.
 * - `customer` (Drinks Cart): personal accounts. No status, or `incomplete`, means the form
 *   isn't finished.
 */
export function resolveAccess(status: AccessStatus, mode: "company" | "customer"): AccessState {
  const pick = (v: string | null | undefined): AccessState | null =>
    v === "approved" ? "approved" : v === "pending" ? "pending" : v === "rejected" ? "rejected" : null;
  if (mode === "company") {
    if (!status.company) return "signup";
    return pick(status.company.status) ?? "approved";
  }
  return pick(status.customerStatus) ?? "signup";
}

/** Pages a signed-in but not-yet-approved person may see. */
export function accessRedirect(state: AccessState, pathname: string): string | null {
  const onSignup = pathname === "/signup" || pathname.startsWith("/signup/");
  const onPending = pathname === "/pending";
  if (state === "signup") return onSignup ? null : "/signup";
  if (state === "pending" || state === "rejected") return onPending ? null : "/pending";
  return onSignup || onPending ? "/" : null;
}
