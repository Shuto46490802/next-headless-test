import { createContentfulClient, type ContentfulConfig, type RequestOptions } from "./client";
import { resolveCollection } from "./resolve";
import type { Article, Audience, Page, SiteSettings } from "./types";

export * from "./types";
export * from "./links";
export { ContentfulApiError, type ContentfulConfig, type RequestOptions, type SiteCode as ClientSiteCode } from "./client";

export function createContentful(config: ContentfulConfig) {
  const client = createContentfulClient(config);

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

    async getArticle(slug: string, opts?: RequestOptions): Promise<Article | null> {
      const col = await client.getEntries({ content_type: "article", "fields.slug": slug, limit: 1, include: 2 }, opts);
      return resolveCollection<Article>(col)[0] ?? null;
    },
  };
}

export type Contentful = ReturnType<typeof createContentful>;
