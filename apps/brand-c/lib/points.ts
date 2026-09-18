import type { Cart } from "@repo/shopify-storefront";
import { getSession } from "./session";
import { SITE_MEMBERSHIP, customerData } from "./shopify";

export interface PointsContext {
  /** Pay-with-points is offered: the site is Drinks Cart and the customer is signed in. */
  enabled: boolean;
  /** `mindarc_poc.points_balance`; 0 when unset. Null only while disabled. */
  balance: number | null;
}

const DISABLED: PointsContext = { enabled: false, balance: null };

/**
 * Pay-with-points is a Drinks Cart (DC) feature. Login already locks this site to DC members,
 * so "signed in" implies the DC membership the brief requires; the explicit check keeps this
 * file safe to copy into another brand.
 */
export async function getPointsContext(): Promise<PointsContext> {
  if (SITE_MEMBERSHIP !== "DC") return DISABLED;
  const session = await getSession();
  if (!session) return DISABLED;
  try {
    const profile = await customerData.getPointsProfile(session.customerId);
    // An unset points_balance metafield means the customer has no points to spend.
    return { enabled: true, balance: profile.balance ?? 0 };
  } catch (err) {
    // Fail closed: without a balance we can't tell what's affordable, so don't offer points.
    console.warn("Failed to load points profile", err);
    return DISABLED;
  }
}

/** Sum of points_cost × quantity over lines marked `_use_points=true` — mirrors the checkout function. */
export function cartPointsTotal(cart: Cart | null): number {
  if (!cart) return 0;
  return cart.lines.reduce((sum, line) => {
    const cost = line.merchandise.product.pointsCost;
    return line.usePoints && cost != null ? sum + cost * line.quantity : sum;
  }, 0);
}
