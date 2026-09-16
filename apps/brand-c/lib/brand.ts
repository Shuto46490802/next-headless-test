import type { BrandConfig } from "@repo/ui";
import type { SiteMembership } from "@repo/customer-data";

export const brand: BrandConfig = {
  slug: "drinks-cart",
  name: "Drinks Cart",
  tagline: "Members-only access for Drinks Cart customers.",
};

/**
 * The `mindarc_poc.site_membership` value this site is locked to. Customers whose
 * membership is set to a different code are refused at login.
 */
export const siteMembership: SiteMembership = "DC";
