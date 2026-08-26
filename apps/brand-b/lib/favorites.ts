import { getSession } from "./session";
import { customerData } from "./shopify";

export async function getFavouriteIds(): Promise<Set<string>> {
  const session = await getSession();
  if (!session) return new Set();
  const ids = await customerData.getFavourites(session.customerId);
  return new Set(ids);
}
