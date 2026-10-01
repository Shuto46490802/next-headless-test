import type { Metadata } from "next";
import { Breadcrumb, CategoryRail, NoSearchResults, ProductListing, ProductRailSection, SearchResultsHead } from "@repo/ui";
import { SORT_OPTIONS } from "@repo/shopify-storefront";
import { storefront } from "../../../lib/shopify";
import { getSession } from "../../../lib/session";
import { getFavouriteIds } from "../../../lib/favorites";
import { SHOW_CREDIT, getBuyer, readListingParams, type ListingSearchParams } from "../../../lib/listing";
import { addToCartAction } from "../../product-actions";
import { getPointsContext } from "../../../lib/points";

type Props = { searchParams: Promise<ListingSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = readListingParams(await searchParams);
  return { title: q ? `Search: ${q}` : "Search", robots: { index: false } };
}

/**
 * Figma "CC / Search results": breadcrumb, the quoted-term head with a result summary, then the
 * same listing body as the PLP (filters from Search & Discovery via `search.productFilters`).
 * No matches shows the no-results state, the category rail and best sellers instead.
 */
export default async function SearchPage({ searchParams }: Props) {
  const { filters, sort, first, q } = readListingParams(await searchParams);
  const [session, favouriteIds, points] = await Promise.all([getSession(), getFavouriteIds(), getPointsContext()]);
  const pointsEnabled = points.enabled;
  const isLoggedIn = Boolean(session);
  const favs = [...favouriteIds];
  const crumbs = [{ label: "Home", href: "/" }, { label: "Search", href: "/search" }, ...(q ? [{ label: q }] : [])];

  if (!q) {
    return (
      <>
        <Breadcrumb items={crumbs} />
        <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-10">
          <h1 className="font-heading text-5xl font-bold text-brand">Search</h1>
          <form action="/search" className="mt-6 flex max-w-xl gap-3">
            <input name="q" type="search" placeholder="Search products" className="h-12 flex-1 rounded-full border border-neutral-300 px-5" />
            <button className="h-12 rounded-full bg-brand px-6 font-heading font-bold uppercase text-white">Search</button>
          </form>
        </section>
      </>
    );
  }

  const buyer = await getBuyer();
  const results = await storefront.searchProducts(q, { filters, sort, first, buyer });

  // Nothing matches the term at all (not just the current filters): no-results state.
  if (results.totalCount === 0 && filters.length === 0) {
    const [popular, categories] = await Promise.all([
      storefront.getPopularProducts(4, buyer).catch(() => []),
      storefront.listCollections(10).catch(() => []),
    ]);
    return (
      <>
        <Breadcrumb items={crumbs} />
        <NoSearchResults query={q} explainer="Check the spelling, try a broader term like a brand or style, or browse the range by category." />
        <CategoryRail categories={categories.filter((c) => c.handle !== "frontpage")} />
        <ProductRailSection heading="Popular instead" products={popular} onAddToCart={addToCartAction} isLoggedIn={isLoggedIn} favouriteIds={favs} showCredit={SHOW_CREDIT} showPoints={pointsEnabled} />
      </>
    );
  }

  const categoryCount = results.filters.find((f) => /categor|product type/i.test(f.label))?.values.filter((v) => v.count > 0).length ?? 0;
  const summary = [
    `${results.totalCount} ${results.totalCount === 1 ? "product" : "products"}`,
    categoryCount ? `${categoryCount} ${categoryCount === 1 ? "category" : "categories"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Breadcrumb items={crumbs} />
      <SearchResultsHead query={q} summary={summary} />
      <ProductListing
        products={results.products}
        filters={results.filters}
        total={results.totalCount}
        hasNextPage={results.pageInfo.hasNextPage}
        sort={sort}
        sortOptions={SORT_OPTIONS}
        onAddToCart={addToCartAction}
        isLoggedIn={isLoggedIn}
        favouriteIds={favs}
        showCredit={SHOW_CREDIT}
        showPoints={pointsEnabled}
      />
    </>
  );
}
