export type SiteCode = "CC" | "DC" | "PC";

export interface ContentfulConfig {
  spaceId: string;
  environment: string;
  deliveryToken: string;
  /** Optional. When set, `preview: true` requests use the Content Preview API and return drafts. */
  previewToken?: string;
  /**
   * The site this app serves. Every query filters on `fields.sites[in]=<site>`, so one app can
   * never render another site's content even if an editor tags an entry wrongly.
   */
  site: SiteCode;
}

export class ContentfulApiError extends Error {
  constructor(
    message: string,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = "ContentfulApiError";
  }
}

export interface RequestOptions {
  preview?: boolean;
  /** Next.js fetch cache options. Defaults to 60s revalidation; preview requests are never cached. */
  next?: { revalidate?: number | false; tags?: string[] };
}

/* ---- Raw Content Delivery API shapes (REST). ---- */

export interface CdaLink {
  sys: { type: "Link"; linkType: "Entry" | "Asset"; id: string };
}
export interface CdaEntry {
  sys: { id: string; type: "Entry"; contentType: { sys: { id: string } }; updatedAt?: string };
  fields: Record<string, unknown>;
}
export interface CdaAsset {
  sys: { id: string; type: "Asset" };
  fields: {
    title?: string;
    description?: string;
    file?: { url: string; contentType: string; details?: { image?: { width: number; height: number } } };
  };
}
export interface CdaCollection {
  total: number;
  skip: number;
  limit: number;
  items: CdaEntry[];
  includes?: { Entry?: CdaEntry[]; Asset?: CdaAsset[] };
}

/**
 * Thin client over the REST Content Delivery / Preview API. REST with `include` is used instead of
 * GraphQL because a page with 20+ polymorphic section types would exceed GraphQL's query
 * complexity limit; link resolution happens in `resolve.ts`.
 */
export function createContentfulClient(config: ContentfulConfig) {
  async function getEntries(
    params: Record<string, string | number | boolean | undefined>,
    opts: RequestOptions = {},
  ): Promise<CdaCollection> {
    const preview = Boolean(opts.preview && config.previewToken);
    const host = preview ? "preview.contentful.com" : "cdn.contentful.com";
    const token = preview ? (config.previewToken as string) : config.deliveryToken;

    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) search.set(k, String(v));
    search.set("fields.sites[in]", config.site);
    if (!search.has("include")) search.set("include", "6");
    if (!search.has("locale")) search.set("locale", "en-US");

    const url = `https://${host}/spaces/${config.spaceId}/environments/${config.environment}/entries?${search}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: preview ? { revalidate: 0 } : { revalidate: 60, tags: ["contentful"], ...opts.next },
    });
    const json = (await res.json()) as CdaCollection & { message?: string; details?: unknown };
    if (!res.ok) {
      throw new ContentfulApiError(`Contentful request failed (${res.status}): ${json.message ?? ""}`, json.details ?? json);
    }
    return json;
  }

  return { getEntries, site: config.site };
}

export type ContentfulClient = ReturnType<typeof createContentfulClient>;
