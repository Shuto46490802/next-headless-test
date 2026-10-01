import { cache } from "react";
import type { AccountNavGroup } from "@repo/ui";
import type { AccountOverview } from "@repo/shopify-customer";
import { getSession, getValidAccessToken } from "./session";
import { customerAccount } from "./shopify";
import { siteMembership } from "./brand";

const IS_CC = siteMembership === "CC";

/** Wording that differs between Club Connect and Partner Connect. */
export const ACCOUNT_COPY = IS_CC
  ? { org: "Club", creditLabel: "Club credit", emptyCart: "Add products to start your club's next order.", team: "club team" }
  : { org: "Business", creditLabel: "Credit", emptyCart: "Add products to start your next order.", team: "partner team" };

/** Account rail and account menu entries (Figma "AccountRail v2"). */
export const ACCOUNT_GROUPS: AccountNavGroup[] = [
  {
    label: "Account",
    items: [
      { href: "/account", label: "Dashboard", icon: "dashboard" },
      { href: "/account/orders", label: "Orders & invoices", icon: "orders" },
      { href: "/account/credit", label: "Credit history", icon: "credit" },
      { href: "/account/lists", label: "Shopping lists", icon: "lists" },
    ],
  },
  {
    label: ACCOUNT_COPY.org,
    items: [
      { href: "/account/details", label: "User details", icon: "user" },
      { href: "/account/club", label: `${ACCOUNT_COPY.org} details`, icon: "club" },
      { href: "/account/users", label: `${ACCOUNT_COPY.org} users`, icon: "users" },
      ...(IS_CC ? [{ href: "/account/invite", label: "Invite a club", icon: "invite" as const }] : []),
    ],
  },
];

/**
 * The signed-in customer, their club and its credit metafields. Cached per request so the header,
 * account layout and page share one Customer Account API call. Null when signed out or on error.
 */
export const getAccountOverview = cache(async (): Promise<AccountOverview | null> => {
  const session = await getSession();
  if (!session) return null;
  try {
    return await customerAccount.getAccountOverview(await getValidAccessToken(session));
  } catch (err) {
    console.warn("Account overview failed", err);
    return null;
  }
});

export const fullName = (o: { firstName: string | null; lastName: string | null } | null) => [o?.firstName, o?.lastName].filter(Boolean).join(" ") || null;
