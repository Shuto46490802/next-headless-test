"use server";

import { revalidatePath } from "next/cache";
import { ShoppingListError } from "@repo/customer-data";
import { CartMutationError } from "@repo/shopify-storefront";
import type { ListCartResult, ListResult } from "@repo/ui";
import { addManyToCart } from "../lib/cart";
import { getListOwner } from "../lib/lists";
import { getBuyer } from "../lib/listing";
import { shoppingLists, storefront } from "../lib/shopify";

function fail(err: unknown, fallback: string): ListResult {
  if (err instanceof ShoppingListError) return { ok: false, message: err.message };
  console.error(fallback, err);
  return { ok: false, message: fallback };
}

const refresh = () => revalidatePath("/account", "layout");

/** "Add to list" picker. */
export async function loadListsFor(productIds: string[]): Promise<{ id: string; name: string; has: boolean }[]> {
  const { ownerId } = await getListOwner();
  const lists = await shoppingLists.getLists(ownerId);
  return lists.map((l) => ({ id: l.id, name: l.name, has: productIds.length > 0 && productIds.every((p) => l.productIds.includes(p)) }));
}

export async function createListAction(name: string, productIds: string[] = []): Promise<ListResult> {
  try {
    const { ownerId, customerId } = await getListOwner();
    await shoppingLists.createList(ownerId, { name, createdById: customerId, productIds });
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err, "Couldn't create the list.");
  }
}

export async function addToListAction(listId: string, productIds: string[]): Promise<ListResult> {
  try {
    const { ownerId } = await getListOwner();
    await shoppingLists.addProducts(ownerId, listId, productIds);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err, "Couldn't add to the list.");
  }
}

export async function removeFromListAction(listId: string, productId: string): Promise<ListResult> {
  try {
    const { ownerId } = await getListOwner();
    await shoppingLists.removeProduct(ownerId, listId, productId);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err, "Couldn't remove the product.");
  }
}

export async function renameListAction(listId: string, name: string): Promise<ListResult> {
  try {
    const { ownerId } = await getListOwner();
    await shoppingLists.renameList(ownerId, listId, name);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err, "Couldn't rename the list.");
  }
}

export async function deleteListAction(listId: string): Promise<ListResult> {
  try {
    const { ownerId } = await getListOwner();
    await shoppingLists.deleteList(ownerId, listId);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err, "Couldn't delete the list.");
  }
}

/** "Add all to cart": one of each available product (first available variant), then stamps last ordered. */
export async function addListToCartAction(listId: string): Promise<ListCartResult> {
  try {
    const { ownerId } = await getListOwner();
    const list = await shoppingLists.getList(ownerId, listId);
    if (!list) return { ok: false, message: "That list couldn't be found." };
    const tiles = await storefront.getTilesByIds(list.productIds, await getBuyer());
    const lines = tiles.flatMap((t) => {
      const v = t.variants.find((x) => x.availableForSale);
      return v ? [{ merchandiseId: v.id, quantity: 1 }] : [];
    });
    if (lines.length === 0) return { ok: false, message: "Nothing on this list is available right now." };
    const { cart, skipped } = await addManyToCart(lines);
    await shoppingLists.markOrdered(ownerId, listId).catch((e) => console.warn("markOrdered failed", e));
    refresh();
    return { ok: true, cart, skipped: skipped + (list.productIds.length - lines.length) };
  } catch (err) {
    if (err instanceof CartMutationError) return { ok: false, message: err.message };
    console.error("addListToCart failed", err);
    return { ok: false, message: "Couldn't add the list to your cart." };
  }
}
