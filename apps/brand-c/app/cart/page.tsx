import { revalidatePath } from "next/cache";
import Link from "next/link";
import { CartLineItem, EmptyState, Button, PointsSummary, formatMoney, type CartLineActionResult } from "@repo/ui";
import { CartMutationError } from "@repo/shopify-storefront";
import { getCart, updateCartLine, removeCartLine, setLinePayment } from "../../lib/cart";
import { cartPointsTotal, getPointsContext } from "../../lib/points";

function failure(err: unknown, fallback: string): CartLineActionResult {
  // Validation function rejections (quantity caps, licence rules) arrive as CartMutationError
  // with Shopify's message; anything else gets a generic fallback.
  if (err instanceof CartMutationError) return { ok: false, message: err.message };
  console.error(fallback, err);
  return { ok: false, message: fallback };
}

export default async function CartPage() {
  const [cart, points] = await Promise.all([getCart(), getPointsContext()]);

  async function handleUpdateQuantity(lineId: string, quantity: number): Promise<CartLineActionResult> {
    "use server";
    try {
      await updateCartLine(lineId, quantity);
    } catch (err) {
      return failure(err, "Couldn't update the quantity.");
    }
    revalidatePath("/cart");
  }

  async function handleRemove(lineId: string): Promise<CartLineActionResult> {
    "use server";
    try {
      await removeCartLine(lineId);
    } catch (err) {
      return failure(err, "Couldn't remove the item.");
    }
    revalidatePath("/cart");
  }

  async function handleTogglePoints(lineId: string, usePoints: boolean): Promise<CartLineActionResult> {
    "use server";
    const ctx = await getPointsContext();
    if (!ctx.enabled) return { ok: false, message: "Pay with points isn't available on this account." };
    try {
      await setLinePayment(lineId, usePoints);
    } catch (err) {
      return failure(err, "Couldn't change the payment method for this item.");
    }
    revalidatePath("/cart");
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Your cart is empty"
          description="Browse the catalog and add something you like."
          action={
            <Link href="/">
              <Button>Continue shopping</Button>
            </Link>
          }
        />
      </section>
    );
  }

  const pointsTotal = cartPointsTotal(cart);

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold text-neutral-900">Your cart</h1>
      <div className="flex flex-col">
        {cart.lines.map((line) => (
          <CartLineItem
            key={line.id}
            line={line}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemove}
            onTogglePoints={handleTogglePoints}
            pointsEnabled={points.enabled}
          />
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-4">
        {points.enabled ? <PointsSummary pointsTotal={pointsTotal} balance={points.balance} /> : null}
        <div className="flex items-center justify-between text-lg font-medium text-neutral-900">
          <span>Subtotal</span>
          <span>{formatMoney(cart.cost.subtotalAmount)}</span>
        </div>
        {pointsTotal > 0 ? (
          <p className="text-sm text-neutral-500">
            Subtotal shows cash prices. Points discounts are applied at checkout.
          </p>
        ) : null}
        <a href={cart.checkoutUrl}>
          <Button className="w-full">Checkout</Button>
        </a>
      </div>
    </section>
  );
}
