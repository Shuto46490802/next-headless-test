import { createContentful } from "@repo/contentful";
import { brand } from "./brand";

/**
 * True when the Contentful env vars are set. When false the pages skip the CMS fetch and render
 * the static copy from `lib/brand.ts`, so the app still runs without a Contentful space.
 */
export const contentfulEnabled = Boolean(
  process.env.CONTENTFUL_SPACE_ID && process.env.CONTENTFUL_DELIVERY_TOKEN,
);

/**
 * One Contentful space serves all three brands. This client is locked to this app's brand slug
 * (see `lib/brand.ts`), which must match the `slug` of a Brand entry in Contentful.
 */
export const contentful = createContentful({
  spaceId: process.env.CONTENTFUL_SPACE_ID ?? "",
  environment: process.env.CONTENTFUL_ENVIRONMENT ?? "master",
  deliveryToken: process.env.CONTENTFUL_DELIVERY_TOKEN ?? "",
  previewToken: process.env.CONTENTFUL_PREVIEW_TOKEN,
  brandSlug: brand.slug,
});
