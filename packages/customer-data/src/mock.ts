import { cookies } from "next/headers";
import type { CustomerDataDriver } from "./types";

const BRAND_COOKIE = "shuto_mock_brand";
const FAVOURITES_COOKIE = "shuto_mock_favourites";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

interface StoredValue<T> {
  customerId: string;
  value: T;
}

function safeParse<T>(raw: string | undefined): StoredValue<T> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredValue<T>;
  } catch {
    return null;
  }
}

/**
 * Stand-in for the `custom.brand` / `custom.favourites` customer metafields, backed by
 * signed-out-of-band httpOnly cookies on this browser. Used automatically when no
 * SHOPIFY_ADMIN_API_ACCESS_TOKEN is configured, so the demo works end-to-end without one.
 * Swap for `createAdminDriver` once the real Admin API token is wired up.
 */
export function createMockDriver(): CustomerDataDriver {
  return {
    async getBrand(customerId) {
      const store = await cookies();
      const stored = safeParse<string>(store.get(BRAND_COOKIE)?.value);
      if (!stored || stored.customerId !== customerId) return null;
      return stored.value;
    },

    async setBrand(customerId, brand) {
      const store = await cookies();
      store.set(BRAND_COOKIE, JSON.stringify({ customerId, value: brand }), COOKIE_OPTS);
    },

    async getFavourites(customerId) {
      const store = await cookies();
      const stored = safeParse<string[]>(store.get(FAVOURITES_COOKIE)?.value);
      if (!stored || stored.customerId !== customerId) return [];
      return stored.value;
    },

    async setFavourites(customerId, productIds) {
      const store = await cookies();
      store.set(
        FAVOURITES_COOKIE,
        JSON.stringify({ customerId, value: productIds }),
        COOKIE_OPTS,
      );
    },
  };
}
