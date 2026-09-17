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
  /** Shopify role name at this location, e.g. "Location admin" or "Ordering only". */
  roleName: string;
  roleAssignmentId: string;
  isMainContact: boolean;
  /**
   * `active` once the customer has signed in / created their account (Customer.state ENABLED);
   * `pending` otherwise. New customer accounts have no invite-acceptance step, so pending
   * simply means "hasn't signed in yet".
   */
  status: "active" | "pending";
}

export interface CompanyRole {
  id: string;
  name: string;
}

export interface LocationUsersResult {
  locationId: string;
  locationName: string;
  companyId: string;
  companyName: string;
  roles: CompanyRole[];
  users: LocationUser[];
}
