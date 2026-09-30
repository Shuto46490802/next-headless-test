import { cache } from "react";
import type { SiteSettings } from "@repo/contentful";
import { contentful, contentfulEnabled } from "../lib/contentful";

/** Site settings are read by the layout and by sections (site logo); cache per request. */
export const getSiteSettings = cache(async (preview: boolean): Promise<SiteSettings | null> => {
  if (!contentfulEnabled) return null;
  return contentful.getSiteSettings({ preview }).catch(() => null);
});

export async function getSiteLogo(preview: boolean) {
  const s = await getSiteSettings(preview);
  return s?.logo ?? null;
}
