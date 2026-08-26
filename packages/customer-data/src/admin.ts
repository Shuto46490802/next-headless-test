import type { CustomerDataDriver } from "./types";

export interface AdminApiConfig {
  storeDomain: string;
  apiVersion: string;
  accessToken: string;
}

const METAFIELDS_QUERY = /* GraphQL */ `
  query GetCustomerMetafields($id: ID!) {
    customer(id: $id) {
      brand: metafield(namespace: "custom", key: "brand") {
        value
      }
      favourites: metafield(namespace: "custom", key: "favourites") {
        value
      }
    }
  }
`;

const METAFIELDS_SET_MUTATION = /* GraphQL */ `
  mutation SetCustomerMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        key
        namespace
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

async function adminRequest<TData>(
  config: AdminApiConfig,
  query: string,
  variables: Record<string, unknown>,
): Promise<TData> {
  const res = await fetch(
    `https://${config.storeDomain}/admin/api/${config.apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": config.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  const json = (await res.json()) as { data?: TData; errors?: unknown };
  if (!res.ok || json.errors) {
    throw new Error(`Admin API request failed (${res.status}): ${JSON.stringify(json.errors)}`);
  }
  return json.data as TData;
}

async function setMetafield(
  config: AdminApiConfig,
  customerId: string,
  key: "brand" | "favourites",
  type: "single_line_text_field" | "list.product_reference",
  value: string,
) {
  const data = await adminRequest<{
    metafieldsSet: { userErrors: { field: string[]; message: string; code: string }[] };
  }>(config, METAFIELDS_SET_MUTATION, {
    metafields: [{ ownerId: customerId, namespace: "custom", key, type, value }],
  });
  if (data.metafieldsSet.userErrors.length > 0) {
    throw new Error(
      `Failed to set custom.${key}: ${data.metafieldsSet.userErrors.map((e) => e.message).join(", ")}`,
    );
  }
}

/**
 * Real driver backed by the Admin API. Requires the `custom.brand` (single line text) and
 * `custom.favourites` (list of product references) metafield definitions to exist on the
 * Customer resource — see scripts/setup-metafield-definitions.mjs.
 */
export function createAdminDriver(config: AdminApiConfig): CustomerDataDriver {
  return {
    async getBrand(customerId) {
      const data = await adminRequest<{ customer: { brand: { value: string } | null } | null }>(
        config,
        METAFIELDS_QUERY,
        { id: customerId },
      );
      return data.customer?.brand?.value ?? null;
    },

    async setBrand(customerId, brand) {
      await setMetafield(config, customerId, "brand", "single_line_text_field", brand);
    },

    async getFavourites(customerId) {
      const data = await adminRequest<{
        customer: { favourites: { value: string } | null } | null;
      }>(config, METAFIELDS_QUERY, { id: customerId });
      const raw = data.customer?.favourites?.value;
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },

    async setFavourites(customerId, productIds) {
      await setMetafield(
        config,
        customerId,
        "favourites",
        "list.product_reference",
        JSON.stringify(productIds),
      );
    },
  };
}
