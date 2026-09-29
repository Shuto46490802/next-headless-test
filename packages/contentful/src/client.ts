export interface ContentfulConfig {
  spaceId: string;
  environment: string;
  deliveryToken: string;
  /** Optional. When set, `preview: true` requests use the Content Preview API and return drafts. */
  previewToken?: string;
  /**
   * The Brand entry slug this app is locked to. Every query is filtered on it, so one app can
   * never render another brand's content even if an editor tags an entry wrongly.
   */
  brandSlug: string;
}

export class ContentfulApiError extends Error {
  constructor(
    message: string,
    public readonly errors: unknown,
  ) {
    super(message);
    this.name = "ContentfulApiError";
  }
}

export interface RequestOptions {
  preview?: boolean;
  /** Next.js fetch cache tags/revalidation. Defaults to 60s revalidation. */
  next?: { revalidate?: number | false; tags?: string[] };
}

export function createContentfulClient(config: ContentfulConfig) {
  const endpoint = `https://graphql.contentful.com/content/v1/spaces/${config.spaceId}/environments/${config.environment}`;

  async function request<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    query: string,
    variables?: TVariables,
    opts: RequestOptions = {},
  ): Promise<TData> {
    const preview = Boolean(opts.preview && config.previewToken);
    const token = preview ? (config.previewToken as string) : config.deliveryToken;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables: { ...variables, preview } }),
      next: preview ? { revalidate: 0 } : { revalidate: 60, ...opts.next },
    });

    const json = (await res.json()) as { data?: TData; errors?: unknown };

    if (!res.ok || json.errors) {
      throw new ContentfulApiError(
        `Contentful request failed (${res.status}): ${JSON.stringify(json.errors)}`,
        json.errors,
      );
    }

    return json.data as TData;
  }

  return { request, brandSlug: config.brandSlug };
}

export type ContentfulClient = ReturnType<typeof createContentfulClient>;
