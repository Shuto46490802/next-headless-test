import type { BrandConfig } from "@repo/ui";
import type { SiteMembership } from "@repo/customer-data";

export const brand: BrandConfig = {
  slug: "club-connect",
  name: "Club Connect",
  tagline: "Members-only access for Club Connect customers.",
};

/**
 * The `mindarc_poc.site_membership` value this site is locked to. Customers whose
 * membership is set to a different code are refused at login.
 */
export const siteMembership: SiteMembership = "CC";

/** Sign-up approval lives on the company for Club Connect and Partner Connect. */
export const accessMode = "company" as const;
