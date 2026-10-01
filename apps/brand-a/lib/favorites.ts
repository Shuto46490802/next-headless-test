import { cache } from "react";
import type { ShoppingList } from "@repo/customer-data";
import { customerData, shoppingLists } from "./shopify";
import { findListOwner } from "./lists";

/**
 * The heart on tiles and the product page saves to the owner's "Favourites" shopping list: the
 * company's for Club Connect and Partner Connect, so the whole club shares it. The list is created
 * the first time someone hearts a product, seeded with that person's old personal favourites
 * (`custom.favourites`) so nothing saved before the switch is lost.
 */
export const FAVOURITES_LIST_NAME = "Favourites";

const isFavourites = (l: ShoppingList) => l.name.trim().toLowerCase() === FAVOURITES_LIST_NAME.toLowerCase();

export async function findFavouritesList(ownerId: string): Promise<ShoppingList | null> {
  return (await shoppingLists.getLists(ownerId)).find(isFavourites) ?? null;
}

/** Product IDs on the Favourites list, for filled hearts. Empty when signed out or on error. */
export const getFavouriteIds = cache(async (): Promise<Set<string>> => {
  const owner = await findListOwner();
  if (!owner) return new Set();
  try {
    const list = await findFavouritesList(owner.ownerId);
    return new Set(list?.productIds ?? []);
  } catch (err) {
    console.warn("Favourites list unavailable", err);
    return new Set();
  }
});

/** Heart toggle. Returns the list's product IDs afterwards. */
export async function setFavourite(productIds: string[], action: "add" | "remove"): Promise<string[]> {
  const owner = await findListOwner();
  if (!owner) throw new Error("Not signed in");
  const existing = await findFavouritesList(owner.ownerId);

  if (!existing) {
    if (action === "remove") return [];
    const legacy = await customerData.getFavourites(owner.customerId).catch(() => [] as string[]);
    const created = await shoppingLists.createList(owner.ownerId, {
      name: FAVOURITES_LIST_NAME,
      createdById: owner.customerId,
      productIds: [...new Set([...legacy, ...productIds])],
    });
    return created.productIds;
  }

  if (action === "add") return (await shoppingLists.addProducts(owner.ownerId, existing.id, productIds)).productIds;
  for (const id of productIds) await shoppingLists.removeProduct(owner.ownerId, existing.id, id);
  return existing.productIds.filter((id) => !productIds.includes(id));
}
