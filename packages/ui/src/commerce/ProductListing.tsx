"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FilterRail, appliedLabel } from "./FilterRail";
import { PAGE_SIZE } from "./format";
import { useListingParams } from "./listing-params";
import { ProductTile } from "./ProductTile";
import type { AddToCartAction, ListingFilterData, SortOptionData, TileProductData } from "./types";

export interface ProductListingProps {
  products: TileProductData[];
  filters: ListingFilterData[];
  total: number | null;
  hasNextPage: boolean;
  sort: string;
  sortOptions: readonly SortOptionData[];
  onAddToCart: AddToCartAction;
  isLoggedIn: boolean;
  favouriteIds: string[];
  showCredit?: boolean;
  showPoints?: boolean;
  /** Optional cell placed at index 5 of the grid (the design's inverted promo). */
  promo?: ReactNode;
}

/**
 * Category listing and search results share this body (design annotation: "the toolbar and grid
 * are the same components as the category listing"): Filter/Toolbar, Filter/Rail beside a
 * three-up grid, and Action/Load More. On mobile the rail opens as a full-screen sheet.
 */
export function ProductListing(p: ProductListingProps) {
  const [sheet, setSheet] = useState(false);
  const favourites = new Set(p.favouriteIds);

  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  const tiles = p.products.map((product, i) => (
    <ProductTile
      key={product.id}
      product={product}
      onAddToCart={p.onAddToCart}
      isLoggedIn={p.isLoggedIn}
      isFavourited={favourites.has(product.id)}
      showCredit={p.showCredit}
      showPoints={p.showPoints}
      priority={i < 3}
    />
  ));
  if (p.promo && tiles.length > 5) tiles.splice(5, 0, <div key="promo" className="col-span-2 sm:col-span-1">{p.promo}</div>);

  return (
    <>
      <Toolbar {...p} onOpenFilters={() => setSheet(true)} />
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-8 sm:px-10 sm:py-16 lg:grid-cols-[260px_1fr]">
        <div className="hidden lg:block">
          <FilterRail filters={p.filters} total={p.total} />
        </div>
        {sheet ? (
          <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden" role="dialog" aria-modal="true" aria-label="Filter and sort">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
              <span className="font-heading text-2xl font-bold text-brand">Filter</span>
              <button type="button" aria-label="Close filters" onClick={() => setSheet(false)} className="p-1 text-2xl leading-none">×</button>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
              <FilterRail filters={p.filters} total={p.total} onDone={() => setSheet(false)} />
            </div>
          </div>
        ) : null}
        <div className="flex flex-col">
          {p.products.length === 0 ? (
            <p className="rounded-3xl bg-neutral-50 p-10 text-center text-neutral-600">No products match these filters. Try removing one.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">{tiles}</div>
          )}
          <LoadMore shown={p.products.length} total={p.total} hasNextPage={p.hasNextPage} />
        </div>
      </div>
    </>
  );
}

function Toolbar({ total, products, filters, sort, sortOptions, onOpenFilters }: ProductListingProps & { onOpenFilters: () => void }) {
  const { active, toggle, clear, setSort } = useListingParams();
  const count = total ?? products.length;
  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-10">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-neutral-200 py-4">
        <p className="font-heading text-2xl font-bold leading-[1.2] text-brand sm:text-[32px]">
          {count} {count === 1 ? "product" : "products"}
        </p>
        <div className="order-3 flex w-full flex-wrap items-center gap-1 sm:order-none sm:w-auto sm:flex-1">
          {active.length > 0 ? (
            <>
              <span className="mr-1 hidden font-heading text-sm font-bold uppercase tracking-[0.05em] text-neutral-500 sm:inline">Filtered by</span>
              {active.map((input) => (
                <button
                  key={input}
                  type="button"
                  onClick={() => toggle(input)}
                  className="flex items-center gap-1 rounded-full bg-brand-tint px-4 py-2.5 text-sm font-medium text-brand"
                  aria-label={`Remove filter ${appliedLabel(input, filters)}`}
                >
                  {appliedLabel(input, filters)}
                  <span aria-hidden className="text-base leading-none">×</span>
                </button>
              ))}
              <button type="button" onClick={clear} className="ml-2 text-sm text-brand underline">Clear all</button>
            </>
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onOpenFilters} className="rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-medium text-brand lg:hidden">
            Filter{active.length ? ` (${active.length})` : ""}
          </button>
          <label className="flex items-center gap-2">
            <span className="hidden font-heading text-sm font-bold uppercase tracking-[0.05em] text-neutral-500 sm:inline">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-sm border border-neutral-300 bg-white px-4 py-2.5 text-base font-medium text-brand"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

function LoadMore({ shown, total, hasNextPage }: { shown: number; total: number | null; hasNextPage: boolean }) {
  const { loadMore, pending } = useListingParams();
  if (shown === 0) return null;
  const pct = total ? Math.min(100, Math.round((shown / total) * 100)) : null;
  const next = total ? Math.min(PAGE_SIZE, total - shown) : PAGE_SIZE;
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-16">
      <p className="text-base font-medium text-neutral-500">
        Showing {shown}
        {total ? ` of ${total}` : ""} products
      </p>
      {pct != null ? (
        <div className="h-1.5 w-full max-w-[360px] overflow-hidden rounded-full bg-neutral-100" aria-hidden>
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {hasNextPage ? (
        <button
          type="button"
          onClick={() => loadMore(shown + PAGE_SIZE)}
          disabled={pending}
          className="mt-2 rounded-full border border-brand px-8 py-4 font-heading text-xl font-bold uppercase tracking-[0.05em] text-brand transition hover:bg-brand hover:text-white disabled:opacity-60"
        >
          {pending ? "Loading…" : `Load ${next} more`}
        </button>
      ) : null}
    </div>
  );
}
