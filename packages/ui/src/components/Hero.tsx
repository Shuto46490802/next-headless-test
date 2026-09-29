import Link from "next/link";
import type { BrandConfig } from "../types";
import { Button } from "./Button";

/**
 * CMS-driven hero content. Structurally matches `HeroContent` from `@repo/contentful` but is
 * declared here so the UI package stays independent of the CMS.
 */
export interface HeroContentProps {
  headline: string;
  subheadline?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  backgroundColor?: string | null;
  backgroundImage?: { url: string; description?: string | null } | null;
}

export interface HeroProps {
  brand: BrandConfig;
  collectionHandle?: string;
  /** When present, overrides the static brand copy. Falls back to `brand` when null. */
  content?: HeroContentProps | null;
}

export function Hero({ brand, collectionHandle, content }: HeroProps) {
  const fallbackHref = collectionHandle ? `/collections/${collectionHandle}` : "/products";

  const headline = content?.headline ?? brand.name;
  const subheadline = content?.subheadline ?? brand.tagline;
  const ctaLabel = content?.ctaLabel ?? "Shop now";
  const ctaHref = content?.ctaUrl ?? fallbackHref;

  const hasCustomBackground = Boolean(content?.backgroundColor || content?.backgroundImage);
  const style = hasCustomBackground
    ? {
        backgroundColor: content?.backgroundColor ?? undefined,
        backgroundImage: content?.backgroundImage ? `url(${content.backgroundImage.url})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  const textClasses = hasCustomBackground
    ? { heading: "text-white", body: "text-white/85" }
    : { heading: "text-neutral-900", body: "text-neutral-600" };

  return (
    <section
      className={`border-b border-neutral-200 ${hasCustomBackground ? "" : "bg-neutral-50"}`}
      style={style}
      aria-label={content?.backgroundImage?.description ?? undefined}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-24 sm:px-6">
        <h1 className={`max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl ${textClasses.heading}`}>
          {headline}
        </h1>
        {subheadline ? <p className={`max-w-md text-lg ${textClasses.body}`}>{subheadline}</p> : null}
        <Link href={ctaHref}>
          <Button variant={hasCustomBackground ? "secondary" : "primary"}>{ctaLabel}</Button>
        </Link>
      </div>
    </section>
  );
}
