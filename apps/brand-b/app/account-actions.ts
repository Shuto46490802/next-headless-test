"use server";

import { revalidatePath } from "next/cache";
import { CartMutationError } from "@repo/shopify-storefront";
import { orderStatus, type AccountFormState, type MiniCartData } from "@repo/ui";
import { addManyToCart } from "../lib/cart";
import { getValidAccessToken, requireSession } from "../lib/session";
import { customerAccount } from "../lib/shopify";
import { setFavourite } from "../lib/favorites";

type ReorderResult = { ok: true; cart: MiniCartData; skipped: number } | { ok: false; message: string };

async function token() {
  return getValidAccessToken(await requireSession());
}

/** Account menu: orders not yet delivered (company-wide when the customer belongs to one). */
export async function loadOpenOrders(): Promise<number | null> {
  try {
    const t = await token();
    const overview = await customerAccount.getAccountOverview(t);
    const { orders } = await customerAccount.listAccountOrders(t, { scope: "company", locationId: overview.company?.location?.id, first: 30 });
    return orders.filter((o) => {
      const s = orderStatus(o);
      return s.step >= 0 && s.step < 4;
    }).length;
  } catch {
    return null;
  }
}

async function addLines(lines: { variantId: string; quantity: number }[]): Promise<ReorderResult> {
  const usable = lines.filter((l) => l.variantId && l.quantity > 0);
  const missing = lines.length - usable.length;
  if (usable.length === 0) return { ok: false, message: "None of these products are available any more." };
  try {
    const { cart, skipped } = await addManyToCart(usable.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity })));
    return { ok: true, cart, skipped: skipped + missing };
  } catch (err) {
    return { ok: false, message: err instanceof CartMutationError ? err.message : "Couldn't add these to your cart." };
  }
}

/** Orders table "Reorder": every line of the order. */
export async function reorderOrder(orderId: string): Promise<ReorderResult> {
  const order = await customerAccount.getAccountOrder(await token(), orderId);
  if (!order) return { ok: false, message: "That order couldn't be found." };
  return addLines(order.lineItems.map((l) => ({ variantId: l.variantId ?? "", quantity: l.quantity })));
}

/** Order detail "Reorder": the ticked lines. */
export async function reorderLines(lines: { variantId: string; quantity: number }[]): Promise<ReorderResult> {
  await requireSession();
  return addLines(lines);
}

export async function addOrderToFavourites(productIds: string[]): Promise<void> {
  await setFavourite(productIds, "add");
  revalidatePath("/account", "layout");
}

export async function updateAccountDetails(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  if (!firstName || !lastName) return { ok: false, message: "First and last name are required." };
  try {
    await customerAccount.updateProfile(await token(), { firstName, lastName });
    revalidatePath("/account", "layout");
    return { ok: true, message: "Your details have been updated." };
  } catch (err) {
    console.error("updateAccountDetails failed", err);
    return { ok: false, message: "Couldn't save your details. Please try again." };
  }
}
