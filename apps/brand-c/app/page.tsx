import { Hero, ProductCard } from "@repo/ui";
import { brand } from "../lib/brand";
import { storefront } from "../lib/shopify";
import { getSession } from "../lib/session";
import { getFavouriteIds } from "../lib/favorites";

export default async function HomePage() {
  const collections = await storefront.listCollections(1).catch(() => []);
  const featuredCollection = collections[0]
    ? await storefront.getCollection(collections[0].handle, { first: 8 })
    : null;

  const featuredTitle = featuredCollection ? featuredCollection.title : "Shop the collection";
  const featuredProducts = featuredCollection
    ? featuredCollection.products.items
    : (await storefront.listProducts({ first: 8 })).items;

  const [session, favouriteIds] = await Promise.all([getSession(), getFavouriteIds()]);

  return (
    <>
      <Hero brand={brand} collectionHandle={collections[0]?.handle} />
      {featuredProducts.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-8 text-2xl font-semibold text-neutral-900">{featuredTitle}</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isLoggedIn={Boolean(session)}
                isFavourited={favouriteIds.has(product.id)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
