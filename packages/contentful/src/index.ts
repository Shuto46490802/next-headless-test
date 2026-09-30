import { createContentfulClient, type ContentfulClient, type ContentfulConfig, type RequestOptions } from "./client";
import { createFixtureClient, type SpaceFixture } from "./fixture";
import { resolveCollection } from "./resolve";
import type { Article, Audience, Page, SiteSettings } from "./types";

export * from "./types";
export * from "./links";
export { createFixtureClient, type SpaceFixture } from "./fixture";
export { resolveCollection } from "./resolve";
export { ContentfulApiError, type ContentfulConfig, type RequestOptions, type SiteCode as ClientSiteCode } from "./client";

export function createContentful(config: ContentfulConfig, clientOverride?: ContentfulClient) {
  const client = clientOverride ?? createContentfulClient(config);

  return {
    client,
    site: config.site,

    /**
     * A page by slug for this site. "/" is the homepage. When `audience` is given, an entry for
     * that audience wins over an `all` entry (the spec has two "/" pages: loggedOut and signedIn).
     * Null when nothing matches, so callers can fall back to a static layout.
     */
    async getPage(slug: string, audience: Audience = "all", opts?: RequestOptions): Promise<Page | null> {
      const col = await client.getEntries(
        { content_type: "page", "fields.slug": slug || "/", "fields.audience[in]": audience === "all" ? "all" : `${audience},all`, limit: 5, include: 6 },
        opts,
      );
      const pages = resolveCollection<Page>(col);
      return pages.find((p) => p.audience === audience) ?? pages.find((p) => p.audience === "all") ?? pages[0] ?? null;
    },

    /** Announcement bar, header navigation, footer and SEO defaults for this site. */
    async getSiteSettings(opts?: RequestOptions): Promise<SiteSettings | null> {
      const col = await client.getEntries({ content_type: "siteSettings", limit: 1, include: 5 }, opts);
      return resolveCollection<SiteSettings>(col)[0] ?? null;
    },

    /** Articles for this site, newest first, optionally filtered by category. */
    async getArticles(params: { category?: string; limit?: number; skip?: number } = {}, opts?: RequestOptions): Promise<{ items: Article[]; total: number }> {
      const col = await client.getEntries(
        {
          content_type: "article",
          order: "-sys.createdAt",
          limit: params.limit ?? 8,
          skip: params.skip ?? 0,
          include: 1,
          "fields.category": params.category && params.category !== "All" ? params.category : undefined,
        },
        opts,
      );
      return { items: resolveCollection<Article>(col), total: col.total };
    },

    /**
     * The page on this site that contains an entry, walking up the reference graph (a CTA sits in
     * a slide, in a carousel, in a page). Used by Live Preview so editing any nested entry shows
     * the page it appears on. Returns the page plus the id of the top-level section holding it.
     */
    async findPageForEntry(entryId: string, opts?: RequestOptions): Promise<{ page: Page; sectionId: string | null } | null> {
      const seen = new Set<string>([entryId]);
      let frontier: { id: string; topSection: string | null }[] = [{ id: entryId, topSection: null }];
      for (let hop = 0; hop < 4 && frontier.length > 0; hop++) {
        const next: typeof frontier = [];
        for (const { id, topSection } of frontier.slice(0, 8)) {
          const col = await client.getEntries({ links_to_entry: id, include: 0, limit: 25 }, opts);
          for (const parent of col.items) {
            const ct = parent.sys.contentType.sys.id;
            if (ct === "page") {
              const page = await this.getPage(String(parent.fields.slug ?? "/"), (parent.fields.audience as Audience) ?? "all", opts);
              if (page) return { page, sectionId: topSection ?? id };
            } else if (!seen.has(parent.sys.id)) {
              seen.add(parent.sys.id);
              next.push({ id: parent.sys.id, topSection: parent.sys.id });
            }
          }
        }
        frontier = next;
      }
      return null;
    },

    async getArticle(slug: string, opts?: RequestOptions): Promise<Article | null> {
      const col = await client.getEntries({ content_type: "article", "fields.slug": slug, limit: 1, include: 2 }, opts);
      return resolveCollection<Article>(col)[0] ?? null;
    },
  };
}

export type Contentful = ReturnType<typeof createContentful>;

/** The same API, answered from an exported snapshot (see `fixtures/space.json`). */
export function createContentfulFromFixture(fixture: SpaceFixture, site: ContentfulConfig["site"]) {
  return createContentful({ spaceId: fixture.space, environment: fixture.environment, deliveryToken: "", site }, createFixtureClient(fixture, { site }));
}
