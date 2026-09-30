import type { Cta, Link, SiteCode, Visibility } from "./types";

/** Per-site account route table. Credit is CC/PC, points is DC; both live under /account here. */
/**
 * Routes that exist in the apps today. Credit, points, lists, details and invite screens are not
 * built yet, so they land on the account dashboard; update here when the screens exist.
 */
const ACCOUNT_ROUTES: Record<NonNullable<Link["accountRoute"]>, string> = {
  dashboard: "/account",
  orders: "/account/orders",
  credit: "/account",
  points: "/account",
  lists: "/account",
  favourites: "/account/favorites",
  users: "/account/users",
  details: "/account",
  addresses: "/account/addresses",
  invite: "/account/users",
};

export function pageHref(slug: string): string {
  return slug === "/" || slug === "" ? "/" : `/${slug}`;
}

/** Resolves a Link entry to an href. Unknown or incomplete links resolve to "#" so the UI never crashes. */
export function resolveHref(link: Link | null | undefined, _site?: SiteCode): string {
  if (!link) return "#";
  switch (link.linkType) {
    case "page":
      return link.page ? pageHref(link.page.slug) : "#";
    case "collection":
      return link.shopifyHandle ? `/collections/${link.shopifyHandle}` : "/products";
    case "product":
      return link.shopifyHandle ? `/products/${link.shopifyHandle}` : "/products";
    case "account":
      return link.accountRoute ? ACCOUNT_ROUTES[link.accountRoute] : "/account";
    case "external":
      return link.url ?? "#";
    case "anchor":
      return link.url ? (link.url.startsWith("#") ? link.url : `#${link.url}`) : "#";
    default:
      return "#";
  }
}

export function ctaHref(cta: Cta | null | undefined, site?: SiteCode): string {
  return resolveHref(cta?.link ?? null, site);
}

export interface VisibilityContext {
  isLoggedIn: boolean;
  now?: Date;
  /** DC only: the member's user base. Unknown = shown (spec: empty means everyone). */
  userBase?: string | null;
  state?: string | null;
}

/** Applies the shared Visibility pattern (audience, user bases, states, schedule). */
export function isVisible(v: Visibility, ctx: VisibilityContext): boolean {
  const now = ctx.now ?? new Date();
  if (v.audience === "loggedOut" && ctx.isLoggedIn) return false;
  if (v.audience === "signedIn" && !ctx.isLoggedIn) return false;
  if (v.userBases?.length && ctx.userBase && !v.userBases.includes(ctx.userBase)) return false;
  if (v.states?.length && ctx.state && !v.states.includes(ctx.state)) return false;
  if (v.startAt && new Date(v.startAt) > now) return false;
  if (v.endAt && new Date(v.endAt) < now) return false;
  return true;
}
