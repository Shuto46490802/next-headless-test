import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShoppingListDetail } from "@repo/ui";
import { shoppingLists, storefront } from "../../../../../lib/shopify";
import { getListOwner, listIdFromSlug } from "../../../../../lib/lists";
import { SHOW_CREDIT, getBuyer } from "../../../../../lib/listing";
import { addListToCartAction, deleteListAction, removeFromListAction, renameListAction } from "../../../../list-actions";

export const metadata: Metadata = { title: "Shopping list" };

export default async function ShoppingListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { ownerId } = await getListOwner();
  const list = await shoppingLists.getList(ownerId, listIdFromSlug(slug));
  if (!list) notFound();
  const tiles = await storefront.getTilesByIds(list.productIds, await getBuyer()).catch(() => []);
  return (
    <ShoppingListDetail
      list={list}
      showCredit={SHOW_CREDIT}
      items={tiles.map((t) => ({
        productId: t.id,
        handle: t.handle,
        title: t.title,
        brand: t.brand,
        image: t.featuredImage,
        price: t.price,
        credit: t.creditEarned,
        available: t.availableForSale,
      }))}
      actions={{ rename: renameListAction, remove: removeFromListAction, addAll: addListToCartAction, remove_list: deleteListAction }}
    />
  );
}
