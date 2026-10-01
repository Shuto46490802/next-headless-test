import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, CategoryBanner, ProductListing } from "@repo/ui";
import { SORT_OPTIONS } from "@repo/shopify-storefront";
import { storefront } from "../../../../lib/shopify";
import { getSession } from "../../../../lib/session";
import { getFavouriteIds } from "../../../../lib/favorites";
import { SHOW_CREDIT, getBuyer, readListingParams, type ListingSearchParams } from "../../../../lib/listing";
import { addToCartAction } from "../../../product-actions";

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<ListingSearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const listing = await storefront.getCollectionListing(handle, { first: 1 }).catch(() => null);
  return listing ? { title: listing.collection.title, description: listing.collection.description || undefined } : {};
}

/**
 * Figma "CC / PLP": breadcrumb, category banner, then the shared listing body (toolbar, Search &
 * Discovery filter rail, three-up grid, load more). Filters, sort and count live in the URL.
 */
export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ handle }, sp] = await Promise.all([params, searchParams]);
  const { filters, sort, first } = readListingParams(sp);
  const buyer = await getBuyer();
  const [listing, session, favouriteIds] = await Promise.all([
    storefront.getCollectionListing(handle, { filters, sort, first, buyer }),
    getSession(),
    getFavouriteIds(),
  ]);
  if (!listing) notFound();
  const { collection } = listing;
  const type = listing.products[0]?.productType;
  const eyebrow = type && type.toLowerCase() !== collection.title.toLowerCase() ? `${type} / ${collection.title}` : collection.title;

  return (
    <>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/products" }, { label: collection.title }]} />
      <CategoryBanner eyebrow={eyebrow} title={collection.title} description={collection.description} image={collection.image} />
      <ProductListing
        products={listing.products}
        filters={listing.filters}
        total={listing.totalCount}
        hasNextPage={listing.pageInfo.hasNextPage}
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
