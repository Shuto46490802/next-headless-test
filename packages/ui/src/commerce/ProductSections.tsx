import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ProductTile } from "./ProductTile";
import type { AddToCartAction, TileProductData } from "./types";

/** Figma "ABOUT THIS PRODUCT": eyebrow label beside the Shopify description. */
export function ProductAbout({ html }: { html: string }) {
  if (!html.trim()) return null;
  return (
    <section className="mx-auto grid max-w-[1440px] gap-4 border-t border-neutral-200 px-4 py-12 sm:px-10 lg:grid-cols-[260px_1fr] lg:py-16">
      <h2 className="font-heading text-sm font-bold uppercase tracking-[0.05em] text-brand">About this product</h2>
      <div className="prose prose-neutral max-w-3xl text-lg text-neutral-700" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

/** Figma "PRODUCT SPECIFICATION": two-column ruled grid of label/value pairs; empty rows are skipped. */
export function SpecGrid({ rows }: { rows: { label: string; value: string | null | undefined }[] }) {
  const shown = rows.filter((r): r is { label: string; value: string } => Boolean(r.value));
  if (shown.length === 0) return null;
  return (
    <section className="mx-auto grid max-w-[1440px] gap-4 border-t border-neutral-200 px-4 py-12 sm:px-10 lg:grid-cols-[260px_1fr] lg:py-16">
      <h2 className="font-heading text-sm font-bold uppercase tracking-[0.05em] text-brand">Product specification</h2>
      <dl className="grid gap-x-12 sm:grid-cols-2">
        {shown.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-6 border-b border-neutral-200 py-4">
            <dt className="text-sm uppercase tracking-[0.05em] text-neutral-500">{r.label}</dt>
            <dd className="text-right text-base font-medium text-neutral-900">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Figma "CLUBS ALSO ORDERED" / "POPULAR WITH CLUBS INSTEAD": heading over a four-up tile row. */
export function ProductRailSection({
  heading,
  products,
  onAddToCart,
  isLoggedIn,
  favouriteIds,
  showCredit,
  showPoints,
  action,
}: {
  heading: string;
  products: TileProductData[];
  onAddToCart: AddToCartAction;
  isLoggedIn: boolean;
  favouriteIds: string[];
  showCredit?: boolean;
  showPoints?: boolean;
  action?: ReactNode;
}) {
  if (products.length === 0) return null;
  const favs = new Set(favouriteIds);
  return (
    <section className="bg-neutral-50">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-10 lg:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-heading text-3xl font-bold uppercase text-brand sm:text-4xl">{heading}</h2>
          {action}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {products.map((p) => (
            <ProductTile key={p.id} product={p} onAddToCart={onAddToCart} isLoggedIn={isLoggedIn} isFavourited={favs.has(p.id)} showCredit={showCredit} showPoints={showPoints} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** "Shop by category" rail on the no-results page: collection image tiles. */
export function CategoryRail({ heading = "Shop by category", categories }: { heading?: string; categories: { handle: string; title: string; image: { url: string; altText: string | null } | null }[] }) {
  if (categories.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1440px] px-4 pb-12 sm:px-10 lg:pb-16">
      <h2 className="mb-6 font-heading text-2xl font-bold text-brand sm:text-3xl">{heading}</h2>
      <ul className="flex snap-x gap-4 overflow-x-auto pb-2">
        {categories.map((c) => (
          <li key={c.handle} className="w-40 shrink-0 snap-start sm:w-52">
            <Link href={`/collections/${c.handle}`} className="group flex flex-col gap-3">
              <span className="relative block aspect-square overflow-hidden rounded-2xl bg-brand-tint">
                {c.image ? <Image src={c.image.url} alt="" fill sizes="208px" className="object-cover transition group-hover:scale-105" /> : null}
              </span>
              <span className="text-base font-medium text-brand group-hover:underline">{c.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
