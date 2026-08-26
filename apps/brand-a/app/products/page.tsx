import { ProductCard, EmptyState } from "@repo/ui";
import { storefront } from "../../lib/shopify";
import { getSession } from "../../lib/session";
import { getFavouriteIds } from "../../lib/favorites";

export default async function AllProductsPage() {
  const { items: products } = await storefront.listProducts({ first: 24 });
  const [session, favouriteIds] = await Promise.all([getSession(), getFavouriteIds()]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold text-neutral-900">All products</h1>
      {products.length === 0 ? (
        <EmptyState title="No products yet" description="Check back soon." />
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
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
