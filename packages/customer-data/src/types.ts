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
}
