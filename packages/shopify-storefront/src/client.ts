export interface StorefrontConfig {
  storeDomain: string;
  storefrontToken: string;
  apiVersion: string;
}

export class StorefrontApiError extends Error {
  constructor(
    message: string,
    public readonly errors: unknown,
  ) {
    super(message);
    this.name = "StorefrontApiError";
  }
}

export function createStorefrontClient(config: StorefrontConfig) {
  const endpoint = `https://${config.storeDomain}/api/${config.apiVersion}/graphql.json`;

  async function request<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    query: string,
    variables?: TVariables,
    init?: RequestInit,
  ): Promise<TData> {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": config.storefrontToken,
      },
      body: JSON.stringify({ query, variables }),
      ...init,
    });

    const json = (await res.json()) as { data?: TData; errors?: unknown };

    if (!res.ok || json.errors) {
      throw new StorefrontApiError(
        `Storefront API request failed (${res.status})`,
        json.errors,
      );
    }

    return json.data as TData;
  }

  return { request };
}

export type StorefrontClient = ReturnType<typeof createStorefrontClient>;
