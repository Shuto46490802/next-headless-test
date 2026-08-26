import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { OrderLineItems, formatMoney, formatDate } from "@repo/ui";
import { getValidAccessToken, requireSession } from "../../../../lib/session";
import { customerAccount } from "../../../../lib/shopify";
import { addManyToCart } from "../../../../lib/cart";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js doesn't decode %2F/%3A within a dynamic segment back to "/"/":", so the
  // order GID (e.g. gid://shopify/Order/123) arrives still percent-encoded — decode it.
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const session = await requireSession();
  const accessToken = await getValidAccessToken(session);
  const order = await customerAccount.getOrder(accessToken, id);
  if (!order) notFound();

  async function buyAgain(variantIds: string[]) {
    "use server";
    await addManyToCart(variantIds.map((variantId) => ({ merchandiseId: variantId, quantity: 1 })));
    revalidatePath("/cart");
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">{order.name}</h1>
        <p className="text-sm text-neutral-500">
          Placed {formatDate(order.processedAt)} &middot; {order.fulfillmentStatus}
        </p>
      </div>

      <OrderLineItems lineItems={order.lineItems} onBuyAgain={buyAgain} />

      <div className="flex flex-col gap-2 self-end text-sm">
        {order.subtotal ? (
          <div className="flex justify-between gap-12 text-neutral-600">
            <span>Subtotal</span>
            <span>{formatMoney(order.subtotal)}</span>
          </div>
        ) : null}
        {order.totalTax ? (
          <div className="flex justify-between gap-12 text-neutral-600">
            <span>Tax</span>
            <span>{formatMoney(order.totalTax)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-12 font-medium text-neutral-900">
          <span>Total</span>
          <span>{formatMoney(order.totalPrice)}</span>
        </div>
      </div>
    </div>
  );
}
