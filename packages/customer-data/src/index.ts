import { createAdminDriver, hasAdminCredentials } from "./admin";
import { createMockDriver } from "./mock";
import type { CustomerDataDriver } from "./types";

export type {
  CustomerDataDriver,
  PointsProfile,
  SiteMembership,
  LocationUser,
  CompanyRole,
  LocationUsersResult,
} from "./types";
export { createCompanyAdmin, CompanyAdminError, type CompanyAdmin, type AddUserInput } from "./companies";
export { SITE_MEMBERSHIPS, isSiteMembership } from "./types";
export {
  createAdminDriver,
  hasAdminCredentials,
  SITE_MEMBERSHIP_METAFIELD,
  FAVOURITES_METAFIELD,
  POINTS_BALANCE_METAFIELD,
  type AdminApiConfig,
} from "./admin";
export { createMockDriver } from "./mock";

export interface CustomerDataStoreConfig {
  storeDomain: string;
  adminApiVersion: string;
  /** Legacy static token (`shpat_…`). */
  adminAccessToken?: string;
  /** Dev Dashboard app credentials — used when no static token is set. */
  adminClientId?: string;
  adminClientSecret?: string;
}

/**
 * Picks the Admin API driver when Admin credentials are configured (a static token, or a
 * Dev Dashboard client id + secret), otherwise falls back to the cookie-backed mock driver
 * so the app still runs end-to-end without them.
 */
export function createCustomerDataStore(config: CustomerDataStoreConfig): CustomerDataDriver {
  const creds = {
    accessToken: config.adminAccessToken,
    clientId: config.adminClientId,
    clientSecret: config.adminClientSecret,
  };
  if (hasAdminCredentials(creds)) {
    return createAdminDriver({
      storeDomain: config.storeDomain,
      apiVersion: config.adminApiVersion,
      ...creds,
    });
  }
  return createMockDriver();
}
