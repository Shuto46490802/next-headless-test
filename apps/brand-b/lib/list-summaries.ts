import type { ShoppingList } from "@repo/customer-data";
import type { ShoppingListSummary } from "@repo/ui";
import { storefront } from "./shopify";
import { getBuyer } from "./listing";
import { listSlug } from "./lists";

/** Card data: line count, running total (qty 1 each, buyer prices) and the credit it would earn. */
export async function summariseLists(lists: ShoppingList[]): Promise<ShoppingListSummary[]> {
  const ids = [...new Set(lists.flatMap((l) => l.productIds))];
  const tiles = await storefront.getTilesByIds(ids, await getBuyer()).catch(() => []);
  const byId = new Map(tiles.map((t) => [t.id, t]));
  return lists.map((l) => {
    const products = l.productIds.map((id) => byId.get(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
    const currencyCode = products[0]?.price.currencyCode ?? "AUD";
    const total = products.reduce((n, p) => n + Number(p.price.amount), 0);
    const credit = products.reduce((n, p) => n + (p.creditEarned ? Number(p.creditEarned.amount) : 0), 0);
    return {
      id: l.id,
      slug: listSlug(l.id),
      name: l.name,
      createdBy: l.createdBy,
      lastOrderedAt: l.lastOrderedAt,
      lines: products.length,
      total: products.length ? { amount: total.toFixed(2), currencyCode } : null,
      credit: credit > 0 ? { amount: credit.toFixed(2), currencyCode } : null,
    };
  });
}
