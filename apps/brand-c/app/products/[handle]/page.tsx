import { notFound } from "next/navigation";
import Image from "next/image";
import { AddToCartForm, FavoriteButton, type AddToCartResult } from "@repo/ui";
import { CartMutationError } from "@repo/shopify-storefront";
import { storefront } from "../../../lib/shopify";
import { addToCart, getCart } from "../../../lib/cart";
import { getSession } from "../../../lib/session";
import { getFavouriteIds } from "../../../lib/favorites";
import { cartPointsTotal, getPointsContext } from "../../../lib/points";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await storefront.getProduct(handle);
  if (!product) notFound();

  const [session, favouriteIds, points, cart] = await Promise.all([
    getSession(),
    getFavouriteIds(),
    getPointsContext(),
    getCart(),
  ]);
  const pointsCost = product.pointsCost;
  const pointsAvailable = Math.max(0, (points.balance ?? 0) - cartPointsTotal(cart));

  async function addProductToCart(variantId: string, quantity: number): Promise<AddToCartResult> {
    "use server";
    try {
      // One button: pay with points automatically when the customer's remaining balance
      // (after what's already in the cart) covers points_cost × quantity, otherwise cash.
      // Decided server-side so the browser can't opt into a discount it can't afford.
      const ctx = await getPointsContext();
      let usePoints = false;
      if (ctx.enabled && pointsCost != null) {
        const remaining = (ctx.balance ?? 0) - cartPointsTotal(await getCart());
        usePoints = pointsCost * quantity <= remaining;
      }
      const updated = await addToCart(variantId, quantity, usePoints);
      return { ok: true, cart: updated, paidWithPoints: usePoints };
    } catch (err) {
      // Validation function rejections (e.g. no liquor licence) arrive as CartMutationError
      // carrying the function's message; anything else gets a generic fallback.
      return {
        ok: false,
        message: err instanceof CartMutationError ? err.message : "Couldn't add to cart. Please try again.",
      };
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
          {product.images[0] ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].altText ?? product.title}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          ) : null}
          <FavoriteButton
            productId={product.id}
            initiallyFavourited={favouriteIds.has(product.id)}
            isLoggedIn={Boolean(session)}
            className="absolute right-4 top-4"
          />
        </div>
        {product.images.length > 1 ? (
          <div className="grid grid-cols-4 gap-3">
            {product.images.slice(1, 5).map((image, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
                <Image src={image.url} alt={image.altText ?? product.title} fill sizes="25vw" className="object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-semibold text-neutral-900">{product.title}</h1>
        <AddToCartForm
          options={product.options}
          variants={product.variants}
          onAddToCart={addProductToCart}
          points={points.enabled && pointsCost != null ? { costPerUnit: pointsCost, available: pointsAvailable } : null}
        />
        <div
          className="prose prose-neutral max-w-none text-neutral-600"
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
        />
      </div>
    </section>
  );
}
