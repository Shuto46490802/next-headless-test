import { revalidatePath } from "next/cache";
import Link from "next/link";
import { CartLineItem, EmptyState, Button, formatMoney } from "@repo/ui";
import { getCart, updateCartLine, removeCartLine } from "../../lib/cart";

export default async function CartPage() {
  const cart = await getCart();

  async function handleUpdateQuantity(lineId: string, quantity: number) {
    "use server";
    await updateCartLine(lineId, quantity);
    revalidatePath("/cart");
  }

  async function handleRemove(lineId: string) {
    "use server";
    await removeCartLine(lineId);
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
          />
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-4">
        <div className="flex items-center justify-between text-lg font-medium text-neutral-900">
          <span>Subtotal</span>
          <span>{formatMoney(cart.cost.subtotalAmount)}</span>
        </div>
        <a href={cart.checkoutUrl}>
          <Button className="w-full">Checkout</Button>
        </a>
      </div>
    </section>
  );
}
