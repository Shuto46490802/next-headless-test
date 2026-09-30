import { draftMode } from "next/headers";
import { Hero, ProductCard } from "@repo/ui";
import { brand } from "../lib/brand";
import { storefront } from "../lib/shopify";
import { contentful, contentfulEnabled } from "../lib/contentful";
import { getSession } from "../lib/session";
import { getFavouriteIds } from "../lib/favorites";
import { PageSections } from "./sections";
import { getSiteLogo } from "./site-settings";

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { isEnabled: preview } = await draftMode();
  const sp = await searchParams;
  const [session, favouriteIds, collections] = await Promise.all([getSession(), getFavouriteIds(), storefront.listCollections(1).catch(() => [])]);

  // The signed-in homepage lives in Contentful: the "/" Page entry with audience signedIn.
  const page = contentfulEnabled ? await contentful.getPage("/", "signedIn", { preview }).catch(() => null) : null;
  if (page) {
    return (
      <PageSections
        sections={page.sections}
        ctx={{ isLoggedIn: Boolean(session), favouriteIds, showPoints: false, preview, siteLogo: await getSiteLogo(preview), searchParams: sp, defaultCollectionHandle: collections[0]?.handle }}
      />
    );
  }

  // No Contentful page for this site (or Contentful not configured): static fallback layout.
  const featuredProducts = await storefront.listProducts({ first: 8 }).then((r) => r.items).catch(() => []);
  return (
    <>
      <Hero brand={brand} collectionHandle={collections[0]?.handle} />
      {featuredProducts.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} isLoggedIn={Boolean(session)} isFavourited={favouriteIds.has(product.id)} showPoints={false} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
