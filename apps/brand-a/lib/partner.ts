import type { CompanyLocationAccess } from "@repo/shopify-customer";
import { getValidAccessToken, requireSession } from "./session";
import { customerAccount } from "./shopify";

/**
 * The signed-in customer's company locations, straight from the Customer Account API. This
 * is the source of truth for what they may see and do on the partner Users page — never the
 * ids the browser sends.
 */
export async function getPartnerLocations(): Promise<CompanyLocationAccess[]> {
  const session = await requireSession();
  const accessToken = await getValidAccessToken(session);
  return customerAccount.getCompanyAccess(accessToken);
}

/** Picks the requested location if the customer has access to it, else their first one. */
export function pickLocation(
  locations: CompanyLocationAccess[],
  requestedId: string | undefined,
): CompanyLocationAccess | null {
  if (locations.length === 0) return null;
  return locations.find((l) => l.locationId === requestedId) ?? locations[0]!;
}

/**
 * Authorization gate for every write on the Users page: the caller must hold an admin role
 * at exactly this location. Throws a plain Error (not shown to the user) on failure.
 */
export async function requireLocationAdmin(locationId: string): Promise<CompanyLocationAccess> {
  const locations = await getPartnerLocations();
  const match = locations.find((l) => l.locationId === locationId);
  if (!match) throw new Error("Not a member of this location");
  if (!match.isAdmin) throw new Error("Not an admin of this location");
  return match;
}
