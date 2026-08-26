import { notFound } from "next/navigation";
import { ProductCard, EmptyState } from "@repo/ui";
import { storefront } from "../../../lib/shopify";
import { getSession } from "../../../lib/session";
import { getFavouriteIds } from "../../../lib/favorites";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const collection = await storefront.getCollection(handle, { first: 24 });
  if (!collection) notFound();

  const [session, favouriteIds] = await Promise.all([getSession(), getFavouriteIds()]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold text-neutral-900">{collection.title}</h1>
      {collection.description ? (
        <p className="mb-8 max-w-2xl text-neutral-600">{collection.description}</p>
      ) : null}

      {collection.products.items.length === 0 ? (
        <EmptyState title="No products yet" description="Check back soon." />
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {collection.products.items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isLoggedIn={Boolean(session)}
              isFavourited={favouriteIds.has(product.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
