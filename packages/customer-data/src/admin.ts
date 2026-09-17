import { isSiteMembership, type CustomerDataDriver } from "./types";

/**
 * Admin API credentials. Provide EITHER a static `accessToken` (legacy custom app created in
 * the store admin before 2026, `shpat_…`) OR the `clientId` + `clientSecret` of a custom app
 * created in the Dev Dashboard. With the latter, a short-lived token is fetched via the
 * client credentials grant and cached until shortly before it expires.
 */
export interface AdminApiConfig {
  storeDomain: string;
  apiVersion: string;
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export function hasAdminCredentials(
  config: Partial<Pick<AdminApiConfig, "accessToken" | "clientId" | "clientSecret">>,
): boolean {
  return Boolean(config.accessToken || (config.clientId && config.clientSecret));
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

/** Per store domain — module-level so all drivers in one server process share it. */
const tokenCache = new Map<string, Promise<CachedToken>>();

async function fetchClientCredentialsToken(config: AdminApiConfig): Promise<CachedToken> {
  // Shopify's OAuth endpoint expects a form-encoded body, not JSON.
  const res = await fetch(`https://${config.storeDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId!,
      client_secret: config.clientSecret!,
    }).toString(),
  });
  const text = await res.text();
  let json: { access_token?: string; expires_in?: number; error?: string; error_description?: string } = {};
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON body — surfaced via `text` below
  }
  if (!res.ok || !json.access_token) {
    const detail = json.error_description ?? json.error ?? text.slice(0, 300) ?? "empty response";
    throw new Error(
      `Admin API client credentials grant failed (${res.status}): ${detail}. ` +
        "Check SHOPIFY_ADMIN_CLIENT_ID / SHOPIFY_ADMIN_CLIENT_SECRET, that the app is installed on the store, " +
        "and that the store and app are in the same Dev Dashboard organization.",
    );
  }
  // Tokens last ~24h; refresh a minute early so an in-flight request never uses a dead one.
  const ttlMs = ((json.expires_in ?? 86399) - 60) * 1000;
  return { token: json.access_token, expiresAt: Date.now() + ttlMs };
}

async function resolveAccessToken(config: AdminApiConfig): Promise<string> {
  if (config.accessToken) return config.accessToken;
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Admin API not configured: set SHOPIFY_ADMIN_API_ACCESS_TOKEN or SHOPIFY_ADMIN_CLIENT_ID + SHOPIFY_ADMIN_CLIENT_SECRET.");
  }
  const key = `${config.storeDomain}:${config.clientId}`;
  let pending = tokenCache.get(key);
  if (pending) {
    const cached = await pending.catch(() => null);
    if (cached && cached.expiresAt > Date.now()) return cached.token;
  }
  pending = fetchClientCredentialsToken(config);
  tokenCache.set(key, pending);
  try {
    return (await pending).token;
  } catch (err) {
    tokenCache.delete(key);
    throw err;
  }
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

export const POINTS_BALANCE_METAFIELD = {
  namespace: "mindarc_poc",
  key: "points_balance",
  type: "number_integer",
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
      pointsBalance: metafield(
        namespace: "${POINTS_BALANCE_METAFIELD.namespace}"
        key: "${POINTS_BALANCE_METAFIELD.key}"
      ) {
        value
      }
      tags
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
  const accessToken = await resolveAccessToken(config);
  const res = await fetch(
    `https://${config.storeDomain}/admin/api/${config.apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
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

    async getPointsProfile(customerId) {
      const data = await adminRequest<{
        customer: { pointsBalance: { value: string } | null; tags: string[] } | null;
      }>(config, METAFIELDS_QUERY, { id: customerId });
      const raw = data.customer?.pointsBalance?.value;
      const balance = raw == null ? null : Number.parseInt(raw, 10);
      return {
        balance: balance != null && Number.isFinite(balance) ? balance : null,
        tags: data.customer?.tags ?? [],
      };
    },
  };
}
