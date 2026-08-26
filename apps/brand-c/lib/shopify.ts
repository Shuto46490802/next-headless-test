import { createShopifyStorefront } from "@repo/shopify-storefront";
import {
  createShopifyCustomerAccount,
  extractShopId,
  type CustomerAccountOAuthConfig,
} from "@repo/shopify-customer";
import { createCustomerDataStore } from "@repo/customer-data";
import { brand } from "./brand";

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

export const customerData = createCustomerDataStore({
  storeDomain,
  adminApiVersion: process.env.SHOPIFY_ADMIN_API_VERSION ?? "2026-07",
  adminAccessToken: process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
});

export const BRAND_SLUG = brand.slug;
