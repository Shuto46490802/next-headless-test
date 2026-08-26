export interface CustomerAccountConfig {
  storeDomain: string;
  apiVersion: string;
}

export class CustomerAccountApiError extends Error {
  constructor(
    message: string,
    public readonly errors: unknown,
  ) {
    super(message);
    this.name = "CustomerAccountApiError";
  }
}

export function createCustomerAccountClient(config: CustomerAccountConfig) {
  const endpoint = `https://${config.storeDomain}/customer/api/${config.apiVersion}/graphql`;

  async function request<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    accessToken: string,
    query: string,
    variables?: TVariables,
  ): Promise<TData> {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = (await res.json()) as { data?: TData; errors?: unknown };

    if (!res.ok || json.errors) {
      throw new CustomerAccountApiError(
        `Customer Account API request failed (${res.status})`,
        json.errors,
      );
    }

    return json.data as TData;
  }

  return { request };
}

export type CustomerAccountClient = ReturnType<typeof createCustomerAccountClient>;
