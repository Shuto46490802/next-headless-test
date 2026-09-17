import { isSiteMembership, type CustomerDataDriver } from "./types";

export interface AdminApiConfig {
  storeDomain: string;
  apiVersion: string;
  accessToken: string;
}

/** Customer metafields this driver reads/writes. Definitions live in Shopify admin. */
export const SITE_MEMBERSHIP_METAFIELD = {
  namespace: "mindarc_poc",
  key: "site_membership",
  type: "single_line_text_field",
} as const;

export const FAVOURITES_METAFIELD = {
  namespace: "custom",
  key: "favourites",
  type: "list.product_reference",
} as const;

export type MetafieldSpec = typeof SITE_MEMBERSHIP_METAFIELD | typeof FAVOURITES_METAFIELD;

const METAFIELDS_QUERY = /* GraphQL */ `
  query GetCustomerMetafields($id: ID!) {
    customer(id: $id) {
      siteMembership: metafield(
        namespace: "${SITE_MEMBERSHIP_METAFIELD.namespace}"
        key: "${SITE_MEMBERSHIP_METAFIELD.key}"
      ) {
        value
      }
      favourites: metafield(
        namespace: "${FAVOURITES_METAFIELD.namespace}"
        key: "${FAVOURITES_METAFIELD.key}"
      ) {
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

export async function adminRequest<TData>(
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

export async function setMetafield(
  config: AdminApiConfig,
  customerId: string,
  spec: MetafieldSpec,
  value: string,
) {
  const data = await adminRequest<{
    metafieldsSet: { userErrors: { field: string[]; message: string; code: string }[] };
  }>(config, METAFIELDS_SET_MUTATION, {
    metafields: [{ ownerId: customerId, ...spec, value }],
  });
  if (data.metafieldsSet.userErrors.length > 0) {
    throw new Error(
      `Failed to set ${spec.namespace}.${spec.key}: ${data.metafieldsSet.userErrors.map((e) => e.message).join(", ")}`,
    );
  }
}

/**
 * Real driver backed by the Admin API. Requires the `mindarc_poc.site_membership` (single
 * line text, values DC/CC/PC) and `custom.favourites` (list of product references)
 * metafield definitions to exist on the Customer resource — see
 * scripts/setup-metafield-definitions.mjs.
 */
export function createAdminDriver(config: AdminApiConfig): CustomerDataDriver {
  return {
    async getSiteMembership(customerId) {
      const data = await adminRequest<{
        customer: { siteMembership: { value: string } | null } | null;
      }>(config, METAFIELDS_QUERY, { id: customerId });
      const raw = data.customer?.siteMembership?.value?.trim().toUpperCase();
      return isSiteMembership(raw) ? raw : null;
    },

    async setSiteMembership(customerId, membership) {
      await setMetafield(config, customerId, SITE_MEMBERSHIP_METAFIELD, membership);
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
      await setMetafield(config, customerId, FAVOURITES_METAFIELD, JSON.stringify(productIds));
    },
  };
}
