import type { Metadata } from "next";
import { OrdersLoadMore, OrdersTable, OrdersToolbar } from "@repo/ui";
import { getValidAccessToken, requireSession } from "../../../../lib/session";
import { customerAccount } from "../../../../lib/shopify";
import { getAccountOverview } from "../../../../lib/account";
import { reorderOrder } from "../../../account-actions";

export const metadata: Metadata = { title: "Orders & invoices" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

/** Figma "Orders & invoices": search by order number, All users / Only mine, export, load more. */
export default async function OrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const token = await getValidAccessToken(await requireSession());
  const account = await getAccountOverview();
  const locationId = account?.company?.location?.id ?? null;
  const scope = sp.scope === "mine" || !locationId ? "mine" : "company";
  const q = (sp.q ?? "").replace(/\D/g, "");
  const first = Math.min(Math.max(Number(sp.count) || 20, 20), 100);

  const { orders, hasNextPage } = await customerAccount.listAccountOrders(token, { scope, locationId, first, query: q ? `name:${q}` : null });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase text-neutral-500">My account</p>
        <h2 className="font-heading text-3xl font-bold text-brand">Orders &amp; invoices</h2>
      </div>
      <OrdersToolbar orders={orders} canSeeAll={Boolean(locationId)} />
      {orders.length === 0 && q ? <p className="py-8 text-center text-sm text-neutral-500">No orders match #{q}.</p> : <OrdersTable orders={orders} onReorder={reorderOrder} />}
      <OrdersLoadMore shown={orders.length} hasNextPage={hasNextPage} />
    </div>
  );
}
