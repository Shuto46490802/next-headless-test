import { cookies } from "next/headers";
import { isSiteMembership, type CustomerDataDriver } from "./types";

const SITE_MEMBERSHIP_COOKIE = "shuto_mock_site_membership";
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
 * Stand-in for the `mindarc_poc.site_membership` / `custom.favourites` customer metafields,
 * backed by signed-out-of-band httpOnly cookies on this browser. Used automatically when no
 * SHOPIFY_ADMIN_API_ACCESS_TOKEN is configured, so the demo works end-to-end without one.
 * Swap for `createAdminDriver` once the real Admin API token is wired up.
 */
export function createMockDriver(): CustomerDataDriver {
  return {
    async getSiteMembership(customerId) {
      const store = await cookies();
      const stored = safeParse<string>(store.get(SITE_MEMBERSHIP_COOKIE)?.value);
      if (!stored || stored.customerId !== customerId) return null;
      return isSiteMembership(stored.value) ? stored.value : null;
    },

    async setSiteMembership(customerId, membership) {
      const store = await cookies();
      store.set(
        SITE_MEMBERSHIP_COOKIE,
        JSON.stringify({ customerId, value: membership }),
        COOKIE_OPTS,
      );
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

    /** Demo values so pay-with-points renders without an Admin token: 120 points, staff tag. */
    async getPointsProfile() {
      return { balance: 120, tags: ["staff"] };
    },
  };
}
