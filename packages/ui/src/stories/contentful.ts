import { createContentful, createContentfulFromFixture, resolveCollection, type Audience, type PageSection, type SiteCode, type SpaceFixture } from "@repo/contentful";
import fixture from "@repo/contentful/fixtures/space.json";

const env = (k: string) => (typeof process !== "undefined" ? process.env[k] : undefined);

/**
 * Live Delivery API when STORYBOOK_CONTENTFUL_SPACE_ID / _DELIVERY_TOKEN are set (a `.env` file
 * in packages/ui works), otherwise the exported snapshot in @repo/contentful/fixtures/space.json.
 */
export function cms(site: SiteCode) {
  const spaceId = env("STORYBOOK_CONTENTFUL_SPACE_ID");
  const token = env("STORYBOOK_CONTENTFUL_DELIVERY_TOKEN");
  if (spaceId && token) {
    return { client: createContentful({ spaceId, environment: env("STORYBOOK_CONTENTFUL_ENVIRONMENT") ?? "master", deliveryToken: token, previewToken: env("STORYBOOK_CONTENTFUL_PREVIEW_TOKEN"), site }), source: "live" as const };
  }
  return { client: createContentfulFromFixture(fixture as SpaceFixture, site), source: `fixture (${(fixture as SpaceFixture).exportedAt})` as const };
}

/** All published sections of one content type for a site, optionally filtered on a field (e.g. layout). */
export async function sectionsOfType<T extends PageSection>(site: SiteCode, contentType: T["contentType"], where: Record<string, string> = {}): Promise<{ items: T[]; source: string }> {
  const { client, source } = cms(site);
  const params: Record<string, string | number> = { content_type: contentType, include: 6, limit: 20 };
  for (const [k, v] of Object.entries(where)) params[`fields.${k}`] = v;
  const col = await client.client.getEntries(params, { preview: Boolean(env("STORYBOOK_CONTENTFUL_PREVIEW_TOKEN")) });
  return { items: resolveCollection<T>(col), source };
}

export const audienceOf = (g: Record<string, unknown>): Audience => (g.audience === "loggedOut" ? "loggedOut" : "signedIn");
export const siteOf = (g: Record<string, unknown>): SiteCode => (g.site === "PC" || g.site === "DC" ? g.site : "CC");
