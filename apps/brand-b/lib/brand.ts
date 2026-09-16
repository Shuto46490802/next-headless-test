import type { BrandConfig } from "@repo/ui";
import type { SiteMembership } from "@repo/customer-data";

export const brand: BrandConfig = {
  slug: "partner-connect",
  name: "Partner Connect",
  tagline: "Members-only access for Partner Connect customers.",
};

/**
 * The `mindarc_poc.site_membership` value this site is locked to. Customers whose
 * membership is set to a different code are refused at login.
 */
export const siteMembership: SiteMembership = "PC";
