import Link from "next/link";
import { EmptyState, formatMoney, formatDate } from "@repo/ui";
import { getValidAccessToken, requireSession } from "../../../lib/session";
import { customerAccount } from "../../../lib/shopify";

export default async function OrdersPage() {
  const session = await requireSession();
  const accessToken = await getValidAccessToken(session);
  const { orders } = await customerAccount.listOrders(accessToken, { first: 20 });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Orders</h1>
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" description="Your past orders will show up here." />
      ) : (
        <div className="flex flex-col divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${encodeURIComponent(order.id)}`}
              className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50"
            >
              <div className="flex flex-col">
                <span className="font-medium text-neutral-900">{order.name}</span>
                <span className="text-sm text-neutral-500">{formatDate(order.processedAt)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-medium text-neutral-900">{formatMoney(order.totalPrice)}</span>
                <span className="text-sm text-neutral-500">{order.fulfillmentStatus}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
