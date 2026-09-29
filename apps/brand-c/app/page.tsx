import { draftMode } from "next/headers";
import { Hero, ProductCard } from "@repo/ui";
import { brand } from "../lib/brand";
import { storefront } from "../lib/shopify";
import { contentful, contentfulEnabled } from "../lib/contentful";
import { getSession } from "../lib/session";
import { getFavouriteIds } from "../lib/favorites";
import { getPointsContext } from "../lib/points";
import { PageSections } from "./sections";

export default async function HomePage() {
  const { isEnabled: preview } = await draftMode();
  const collections = await storefront.listCollections(1).catch(() => []);
  const defaultCollectionHandle = collections[0]?.handle;
  const [session, favouriteIds, points] = await Promise.all([getSession(), getFavouriteIds(), getPointsContext()]);

  // The homepage layout lives in Contentful: the "home" Page entry lists its sections in order.
  const page = contentfulEnabled ? await contentful.getPage("home", { preview }).catch(() => null) : null;
  if (page) {
    return (
      <PageSections
        sections={page.sections}
        ctx={{ isLoggedIn: Boolean(session), favouriteIds, showPoints: points.enabled, defaultCollectionHandle }}
      />
    );
  }

  // No Contentful page for this brand (or Contentful not configured): static fallback layout.
  const featuredCollection = defaultCollectionHandle
    ? await storefront.getCollection(defaultCollectionHandle, { first: 8 }).catch(() => null)
    : null;
  const featuredTitle = featuredCollection ? featuredCollection.title : "Shop the collection";
  const featuredProducts = featuredCollection
    ? featuredCollection.products.items
    : await storefront
        .listProducts({ first: 8 })
        .then((r) => r.items)
        .catch(() => []);

  return (
    <>
      <Hero brand={brand} collectionHandle={defaultCollectionHandle} />
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
                showPoints={points.enabled}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
