import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetailView } from "@repo/ui";
import { getValidAccessToken, requireSession } from "../../../../../lib/session";
import { customerAccount, storefront } from "../../../../../lib/shopify";
import { SHOW_CREDIT } from "../../../../../lib/listing";
import { addOrderToFavourites, reorderLines } from "../../../../account-actions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${decodeURIComponent(id).split("/").pop()}` };
}

/** Figma "Order detail". The order GID arrives percent-encoded in the segment, so decode it. */
export default async function OrderDetailPage({ params }: Props) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const token = await getValidAccessToken(await requireSession());
  const order = await customerAccount.getAccountOrder(token, id);
  if (!order) notFound();

  // Credit earned and pack line come from the live products (orders don't store metafields).
  const productIds = [...new Set(order.lineItems.map((l) => l.productId).filter((p): p is string => Boolean(p)))];
  const products = productIds.length ? await storefront.getProductsByIds(productIds).catch(() => []) : [];
  const byId = new Map(products.map((p) => [p.id, p]));

  return (
    <OrderDetailView
      order={{
        ...order,
        lineItems: order.lineItems.map((l) => {
          const p = l.productId ? byId.get(l.productId) : undefined;
          return { ...l, creditEarned: p?.creditEarned ?? null, packLabel: p?.packLabel ?? null };
        }),
      }}
      showCredit={SHOW_CREDIT}
      onReorder={reorderLines}
      onAddToFavourites={addOrderToFavourites}
      reportHref={`/contact?order=${encodeURIComponent(order.name)}`}
    />
  );
}
