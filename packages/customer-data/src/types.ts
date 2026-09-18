/**
 * Value of the `mindarc_poc.site_membership` customer metafield. Each headless site is
 * locked to exactly one of these codes:
 *   CC — Club Connect     (apps/brand-a)
 *   PC — Partner Connect  (apps/brand-b)
 *   DC — Drinks Cart      (apps/brand-c)
 */
export type SiteMembership = "CC" | "PC" | "DC";

export const SITE_MEMBERSHIPS: readonly SiteMembership[] = ["CC", "PC", "DC"];

export function isSiteMembership(value: unknown): value is SiteMembership {
  return typeof value === "string" && (SITE_MEMBERSHIPS as readonly string[]).includes(value);
}

export interface CustomerDataDriver {
  /**
   * Reads the customer's site membership (`mindarc_poc.site_membership`), or null if unset
   * or not one of the known codes.
   */
  getSiteMembership(customerId: string): Promise<SiteMembership | null>;
  /** Assigns a site membership to a customer. Should only ever be called once (on first login). */
  setSiteMembership(customerId: string, membership: SiteMembership): Promise<void>;
  /** Product GIDs the customer has favourited (`custom.favourites`). */
  getFavourites(customerId: string): Promise<string[]>;
  setFavourites(customerId: string, productIds: string[]): Promise<void>;
  /**
   * Pay-with-points inputs: `mindarc_poc.points_balance` (null when unset) and the
   * customer's tags (used to pick the default payment method on the PDP).
   */
  getPointsProfile(customerId: string): Promise<PointsProfile>;
  /** Records a successful sign-in (`mindarc_poc.last_login_at`). Called by the OAuth callback. */
  recordLogin(customerId: string): Promise<void>;
}

export interface PointsProfile {
  balance: number | null;
  tags: string[];
}

/** A contact's standing at one company location, as rendered on the partner Users page. */
export interface LocationUser {
  contactId: string;
  customerId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  /** Role held at this location; null once the user is archived (no role here any more). */
  roleId: string | null;
  roleName: string | null;
  /** Every role assignment this contact holds at this location (normally 0 or 1). */
  roleAssignmentIds: string[];
  isMainContact: boolean;
  /**
   * `active` — has a role here and has signed in at least once (`mindarc_poc.last_login_at`,
   * stamped by the OAuth callback; legacy accounts may instead report Customer.state ENABLED).
   * `invited` — has a role here but has never signed in. New customer accounts have no invite
   * to accept, so this simply means "hasn't logged in yet".
   * `deactivated` — still a contact of the company but holds no role at this location, so they
   * can't order for it. Archiving is what puts someone here.
   */
  status: "active" | "invited" | "deactivated";
}

export interface CompanyRole {
  id: string;
  name: string;
}

/** Company details shown in the header block above the users table. */
export interface CompanyProfile {
  id: string;
  name: string;
  /** `Company.externalId` — shown as "ACCOUNT <n>". Null when the merchant hasn't set one. */
  accountNumber: string | null;
  abn: string | null;
  /** True when the company's liquor licence metafield is set — drives the LICENSED badge. */
  licensed: boolean;
}

export interface LocationUsersResult {
  locationId: string;
  locationName: string;
  company: CompanyProfile;
  roles: CompanyRole[];
  /** Role granted when a user is reactivated. */
  defaultRoleId: string | null;
  users: LocationUser[];
}
