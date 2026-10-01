import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export interface Crumb {
  label: string;
  href?: string;
}

/** Figma "Navigation/Breadcrumb": a light-blue strip, slash-separated, last crumb unlinked. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="bg-brand-tint">
      <ol className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-1.5 px-4 py-2 text-xs text-brand sm:px-10">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden className="text-brand/50">/</span> : null}
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="hover:underline">{c.label}</Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined}>{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Figma "Product/Category Banner", type-led variant: navy gradient over the collection image,
 * a short brand rule, the path eyebrow, the display title and the intro line.
 */
export function CategoryBanner({ eyebrow, title, description, image }: { eyebrow?: string; title: string; description?: string; image?: { url: string; altText?: string | null } | null }) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-dark text-white">
      {image ? <Image src={image.url} alt="" fill priority sizes="100vw" className="-z-20 object-cover" /> : null}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[rgba(0,19,40,0.94)] via-[rgba(0,19,40,0.62)] to-[rgba(0,19,40,0.72)]" />
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-12 sm:px-10 sm:py-16">
        <span aria-hidden className="h-1 w-[72px] bg-brand-sky" />
        {eyebrow ? <p className="font-heading text-sm font-bold uppercase tracking-[0.05em]">{eyebrow}</p> : null}
        <h1 className="font-heading text-5xl font-bold leading-none sm:text-7xl">{title}</h1>
        {description ? <p className="max-w-3xl text-base">{description}</p> : null}
      </div>
    </section>
  );
}

/** Figma "Search results head": eyebrow, the quoted term at display size, and the result summary. */
export function SearchResultsHead({ query, summary }: { query: string; summary?: ReactNode }) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 pb-6 pt-10 sm:px-10 sm:py-16">
      <p className="font-heading text-sm font-bold uppercase tracking-[0.05em] text-brand">Search results</p>
      <h1 className="mt-2 break-words font-heading text-5xl font-bold leading-none text-brand sm:text-7xl">“{query}”</h1>
      {summary ? <p className="mt-2 text-base text-neutral-500">{summary}</p> : null}
    </section>
  );
}

/** Figma "No results": the term in the heading, the range explainer and a browse CTA. */
export function NoSearchResults({ query, explainer, browseHref = "/products" }: { query: string; explainer?: string; browseHref?: string }) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-10 sm:py-16">
      <p className="font-heading text-sm font-bold uppercase tracking-[0.05em] text-brand">Search results</p>
      <h1 className="mt-2 max-w-4xl break-words font-heading text-4xl font-bold leading-none text-brand sm:text-6xl">No products match “{query}”</h1>
      {explainer ? <p className="mt-3 max-w-2xl text-lg text-neutral-600">{explainer}</p> : null}
      <Link href={browseHref} className="mt-6 inline-flex rounded-full bg-brand px-8 py-4 font-heading text-lg font-bold uppercase tracking-wide text-white hover:opacity-90">
        Browse all categories
      </Link>
    </section>
  );
}
