import { createShopifyStorefront } from "@repo/shopify-storefront";
import {
  createShopifyCustomerAccount,
  extractShopId,
  type CustomerAccountOAuthConfig,
} from "@repo/shopify-customer";
import { createCompanyAdmin, createCustomerDataStore, hasAdminCredentials } from "@repo/customer-data";
import { siteMembership } from "./brand";

const storeDomain = process.env.SHOPIFY_STORE_DOMAIN as string;

export const storefront = createShopifyStorefront({
  storeDomain,
  storefrontToken: process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_TOKEN as string,
  apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION ?? "2026-07",
});

export const oauthConfig: CustomerAccountOAuthConfig = {
  clientId: process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID as string,
  authorizeEndpoint: process.env.SHOPIFY_CUSTOMER_ACCOUNT_AUTHORIZE_ENDPOINT as string,
  tokenEndpoint: process.env.SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_ENDPOINT as string,
  logoutEndpoint: process.env.SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_ENDPOINT as string,
};

export const customerAccount = createShopifyCustomerAccount({
  shopId: extractShopId(oauthConfig.tokenEndpoint),
  apiVersion: process.env.SHOPIFY_CUSTOMER_API_VERSION ?? "2026-07",
});

/**
 * Admin API credentials: a legacy static token, or a Dev Dashboard app's client id + secret
 * (exchanged for a short-lived token automatically). Either form works; leave all blank to
 * run against the cookie-backed mock driver.
 */
const adminCredentials = {
  accessToken: process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
  clientId: process.env.SHOPIFY_ADMIN_CLIENT_ID,
  clientSecret: process.env.SHOPIFY_ADMIN_CLIENT_SECRET,
};
const adminApiVersion = process.env.SHOPIFY_ADMIN_API_VERSION ?? "2026-07";

export const customerData = createCustomerDataStore({
  storeDomain,
  adminApiVersion,
  adminAccessToken: adminCredentials.accessToken,
  adminClientId: adminCredentials.clientId,
  adminClientSecret: adminCredentials.clientSecret,
});

/**
 * Admin API operations for the partner Users page. Null when no Admin token is configured —
 * the page then explains that user management is unavailable rather than failing.
 */
export const companyAdmin = hasAdminCredentials(adminCredentials)
  ? createCompanyAdmin({ storeDomain, apiVersion: adminApiVersion, ...adminCredentials })
  : null;

export const SITE_MEMBERSHIP = siteMembership;
