import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Breadcrumb, CategoryBanner, ProductListing } from "@repo/ui";
import { SORT_OPTIONS } from "@repo/shopify-storefront";
import { storefront } from "../../../lib/shopify";
import { getSession } from "../../../lib/session";
import { getFavouriteIds } from "../../../lib/favorites";
import { SHOW_CREDIT, getBuyer, readListingParams, type ListingSearchParams } from "../../../lib/listing";
import { addToCartAction } from "../../product-actions";

export const metadata: Metadata = { title: "All products" };

/** Shop-all listing. Uses the store's "all" collection so Search & Discovery filters apply; `?q=` goes to search. */
export default async function AllProductsPage({ searchParams }: { searchParams: Promise<ListingSearchParams> }) {
  const sp = await searchParams;
  const { filters, sort, first, q } = readListingParams(sp);
  if (q) redirect(`/search?q=${encodeURIComponent(q)}`);

  const buyer = await getBuyer();
  const [listing, session, favouriteIds] = await Promise.all([
    storefront.getCollectionListing("all", { filters, sort, first, buyer }).catch(() => null),
    getSession(),
    getFavouriteIds(),
  ]);
  // Without an "all" collection in the store, fall back to best sellers (no facets).
  const fallback = listing ? null : await storefront.getPopularProducts(first, buyer);

  return (
    <>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
      <CategoryBanner eyebrow="Shop" title={listing?.collection.title && listing.collection.handle !== "all" ? listing.collection.title : "All products"} description={listing?.collection.description} image={listing?.collection.image} />
      <ProductListing
        products={listing?.products ?? fallback ?? []}
        filters={listing?.filters ?? []}
        total={listing?.totalCount ?? fallback?.length ?? 0}
        hasNextPage={listing?.pageInfo.hasNextPage ?? false}
        sort={sort}
        sortOptions={SORT_OPTIONS}
        onAddToCart={addToCartAction}
        isLoggedIn={Boolean(session)}
        favouriteIds={[...favouriteIds]}
        showCredit={SHOW_CREDIT}
      />
    </>
  );
}
