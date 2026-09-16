import { createAdminDriver } from "./admin";
import { createMockDriver } from "./mock";
import type { CustomerDataDriver } from "./types";

export type { CustomerDataDriver, SiteMembership } from "./types";
export { SITE_MEMBERSHIPS, isSiteMembership } from "./types";
export { createAdminDriver, SITE_MEMBERSHIP_METAFIELD, FAVOURITES_METAFIELD } from "./admin";
export { createMockDriver } from "./mock";

export interface CustomerDataStoreConfig {
  storeDomain: string;
  adminApiVersion: string;
  adminAccessToken?: string;
}

/**
 * Picks the Admin API driver when SHOPIFY_ADMIN_API_ACCESS_TOKEN is configured, otherwise
 * falls back to the cookie-backed mock driver so the app still runs end-to-end without it.
 */
export function createCustomerDataStore(config: CustomerDataStoreConfig): CustomerDataDriver {
  if (config.adminAccessToken) {
    return createAdminDriver({
      storeDomain: config.storeDomain,
      apiVersion: config.adminApiVersion,
      accessToken: config.adminAccessToken,
    });
  }
  return createMockDriver();
}
