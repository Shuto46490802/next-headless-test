import { createContentful, type SiteCode } from "@repo/contentful";
import { siteMembership } from "./brand";

/**
 * True when the Contentful env vars are set. When false the pages skip the CMS fetch and render
 * the static fallback, so the app still runs without a Contentful space.
 */
export const contentfulEnabled = Boolean(process.env.CONTENTFUL_SPACE_ID && process.env.CONTENTFUL_DELIVERY_TOKEN);

/** The Contentful `sites` code for this app. Same codes as the Shopify site_membership metafield. */
export const site: SiteCode = siteMembership;

/** One Contentful space serves all three sites. Every query is filtered to this app's site code. */
export const contentful = createContentful({
  spaceId: process.env.CONTENTFUL_SPACE_ID ?? "",
  environment: process.env.CONTENTFUL_ENVIRONMENT ?? "master",
  deliveryToken: process.env.CONTENTFUL_DELIVERY_TOKEN ?? "",
  previewToken: process.env.CONTENTFUL_PREVIEW_TOKEN,
  site,
});
