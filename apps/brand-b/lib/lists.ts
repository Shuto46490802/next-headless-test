import { requireSession } from "./session";
import { getAccountOverview } from "./account";

/**
 * Who owns the shopping lists: the company for Club Connect and Partner Connect (shared by every
 * contact), or the customer when they have no company. Always derived from the session, never
 * from the browser.
 */
export async function getListOwner(): Promise<{ ownerId: string; customerId: string; shared: boolean }> {
  const session = await requireSession();
  const company = (await getAccountOverview())?.company;
  return company ? { ownerId: company.id, customerId: session.customerId, shared: true } : { ownerId: session.customerId, customerId: session.customerId, shared: false };
}

/** Lists are addressed by the numeric tail of their metaobject GID in URLs. */
export const listSlug = (id: string) => id.split("/").pop() ?? id;
export const listIdFromSlug = (slug: string) => `gid://shopify/Metaobject/${decodeURIComponent(slug)}`;
