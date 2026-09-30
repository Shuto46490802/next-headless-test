import Image from "next/image";
import { Band, CmsPicture, CtaButton, Eyebrow, Heading, HeadingGroup, Icon, SmartLink, type CmsCta, type CmsHeadingGroup, type CmsImage, type CmsImageGroup } from "./primitives";
import { RichText } from "./RichText";
import type { RichTextDoc } from "./primitives";

export interface ListItemData extends CmsImageGroup {
  id: string;
  kind: "item" | "testimonial" | "jurisdiction" | "brand";
  type?: string;
  title: string;
  eyebrow?: string;
  body?: string;
  value?: string;
  icon?: string;
  href?: string;
  cta?: CmsCta | null;
  brands?: { id: string; name: string; logo: CmsImage | null; href?: string; productCountLabel?: string }[];
  /** testimonial */ quote?: string; attribution?: string;
  /** jurisdiction */ regulator?: string; licenceNumber?: string; richBody?: RichTextDoc | null;
  /** brand */ logo?: CmsImage | null; productCountLabel?: string;
}

export interface ItemListProps extends CmsHeadingGroup {
  id: string;
  layout: "numberedSteps" | "arrowList" | "iconFeatureRow" | "featureColumns" | "categoryTiles" | "timeline" | "statsFeature" | "shortcutTiles" | "logoStrip" | "brandDirectory" | "jurisdictionList" | "testimonialCarousel";
  style?: "white" | "tint" | "navy" | "grey";
  items: ListItemData[];
  cta?: CmsCta | null;
  link?: { label: string; href: string } | null;
  featuredLabel?: string;
  featuredArticle?: { title: string; href: string; standfirst?: string; category?: string; image?: CmsImage | null } | null;
  disclaimer?: string;
  settings?: Record<string, unknown>;
  siteLogo?: CmsImage | null;
}

/** Every list-shaped band; `layout` picks the component. Section ids double as in-page anchors. */
export function ItemList(p: ItemListProps) {
  const tone = p.style ?? "white";
  const inverse = tone === "navy";
  const head = p.heading || p.eyebrow ? <HeadingGroup group={p} size="lg" tone={inverse ? "inverse" : "default"} /> : null;

  switch (p.layout) {
    case "numberedSteps":
      return (
        <Band tone={tone} id={p.id}>
          {head ? <div className="mb-12 text-center [&>div]:items-center">{head}</div> : null}
          <ol className="grid gap-10 md:grid-cols-3">
            {p.items.map((it, i) => (
              <li key={it.id} className="flex items-start gap-5">
                <span className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full font-heading text-3xl font-bold ${inverse ? "bg-white text-brand" : "bg-brand text-white"}`}>{String(i + 1).padStart(2, "0")}</span>
                <span className="flex flex-col gap-1 pt-3">
                  <span className={`font-heading text-xl font-bold ${inverse ? "text-accent" : "text-brand"}`}>{it.title}</span>
                  {it.body ? <span className={`text-base ${inverse ? "text-white/85" : "text-neutral-600"}`}>{it.body}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </Band>
      );

    case "arrowList":
      return (
        <Band tone={tone} id={p.id}>
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            {head}
            <div>
              <ul className={`divide-y ${inverse ? "divide-white/25" : "divide-neutral-200"}`}>
                {p.items.map((it) => (
                  <li key={it.id} className="flex flex-col gap-1 py-5">
                    <span className={`flex items-center gap-2 text-lg font-semibold ${inverse ? "text-accent" : "text-brand"}`}><Icon name="arrowRight" className="h-4 w-4" />{it.title}</span>
                    {it.body ? <span className={`pl-6 ${inverse ? "text-white/85" : "text-neutral-600"}`}>{it.body}</span> : null}
                  </li>
                ))}
              </ul>
              {p.cta ? <CtaButton cta={{ ...p.cta, variant: "ghost" }} className={`mt-4 ${inverse ? "text-accent" : "text-brand"}`} /> : null}
            </div>
          </div>
        </Band>
      );

    case "iconFeatureRow":
      return (
        <Band tone={tone} id={p.id}>
          <div className="flex flex-col items-center gap-10 lg:flex-row">
            {p.settings?.showSiteLogo && p.siteLogo ? <Image src={p.siteLogo.url} alt="" width={220} height={220} className="h-40 w-40 object-contain lg:h-48 lg:w-48" /> : null}
            <div className="flex-1">
              {p.eyebrow ? <Eyebrow className="mb-6 text-center text-brand">{p.eyebrow}</Eyebrow> : null}
              <ul className="flex snap-x gap-8 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-4">
                {p.items.map((it) => (
                  <li key={it.id} className="flex min-w-[220px] snap-start flex-col items-center gap-4 text-center">
                    <span className="flex h-28 w-28 items-center justify-center rounded-full bg-brand-sky/60 text-brand"><Icon name={it.icon ?? "package"} className="h-12 w-12" /></span>
                    <span className="font-heading text-xl font-bold text-brand">{it.title}</span>
                    {it.body ? <span className="text-sm text-neutral-600">{it.body}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Band>
      );

    case "featureColumns":
      return (
        <Band tone={tone} id={p.id} className="[&>div]:py-8">
          <div className={`grid gap-6 ${p.items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
            {p.items.map((it) => (
              <article key={it.id} className="flex flex-col overflow-hidden rounded-3xl bg-brand-tint">
                {it.image ? <div className="relative aspect-[2/1]"><CmsPicture group={it} sizes="(min-width: 1024px) 680px, 100vw" /></div> : null}
                <div className="flex flex-col gap-3 p-8">
                  {it.eyebrow ? <Eyebrow className="text-brand">{it.eyebrow}</Eyebrow> : null}
                  {it.title !== it.eyebrow ? <Heading level="h3" size="lg" className="text-brand">{it.title}</Heading> : null}
                  {it.body ? <p className="text-neutral-600">{it.body}</p> : null}
                  {it.cta ? <CtaButton cta={it.cta} className="mt-2 self-start" /> : null}
                </div>
              </article>
            ))}
          </div>
        </Band>
      );

    case "categoryTiles":
      return (
        <Band tone={tone} id={p.id}>
          <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
            <div className="flex flex-col gap-4">
              <HeadingGroup group={p} size="md" />
              {p.cta ? <CtaButton cta={p.cta} className="self-start" /> : null}
            </div>
            <ul className="flex snap-x gap-4 overflow-x-auto pb-4">
              {p.items.map((it) => (
                <li key={it.id} className="w-[230px] shrink-0 snap-start">
                  <SmartLink href={it.href ?? "#"} className="group relative block aspect-[2/3] overflow-hidden rounded-3xl bg-brand">
                    <CmsPicture group={it} sizes="230px" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 text-white">
                      <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/70"><Icon name="cart" className="h-4 w-4" /></span>
                      <span className="font-heading text-2xl font-bold">{it.title}</span>
                      {it.body ? <span className="text-sm text-white/80">{it.body}</span> : null}
                    </span>
                  </SmartLink>
                </li>
              ))}
            </ul>
          </div>
        </Band>
      );

    case "timeline":
      return (
        <Band tone={tone} id={p.id}>
          {p.eyebrow ? <Eyebrow className="mb-8 text-brand">{p.eyebrow}</Eyebrow> : null}
          <ol className="grid gap-8 border-t border-neutral-200 pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {p.items.map((it) => (
              <li key={it.id} className="flex flex-col gap-2">
                <span className="font-heading text-4xl font-bold text-brand">{it.value}</span>
                <span className="text-neutral-600">{it.body ?? it.title}</span>
              </li>
            ))}
          </ol>
        </Band>
      );

    case "statsFeature":
      return (
        <Band tone={tone} id={p.id}>
          <div className="grid gap-10 lg:grid-cols-2">
            <dl className="grid gap-8 sm:grid-cols-3 lg:grid-cols-1">
              {p.items.map((it) => (
                <div key={it.id}>
                  <dt className="font-heading text-5xl font-bold text-brand">{it.value}</dt>
                  <dd className="text-neutral-600">{it.title}</dd>
                </div>
              ))}
            </dl>
            {p.featuredArticle ? (
              <SmartLink href={p.featuredArticle.href} className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm">
                {p.featuredArticle.image ? <div className="relative aspect-[16/9]"><Image src={p.featuredArticle.image.url} alt="" fill sizes="680px" className="object-cover transition group-hover:scale-105" /></div> : null}
                <div className="flex flex-col gap-2 p-6">
                  {p.featuredLabel ? <Eyebrow className="text-brand">{p.featuredLabel}</Eyebrow> : null}
                  <span className="font-heading text-2xl font-bold text-brand">{p.featuredArticle.title}</span>
                  {p.featuredArticle.standfirst ? <span className="text-neutral-600">{p.featuredArticle.standfirst}</span> : null}
                </div>
              </SmartLink>
            ) : null}
          </div>
        </Band>
      );

    case "shortcutTiles":
      return (
        <Band tone={tone} id={p.id} className="[&>div]:py-8">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {p.items.map((it) => (
              <li key={it.id}>
                <SmartLink href={it.href ?? "#"} className="flex h-full flex-col gap-2 rounded-2xl border border-neutral-200 p-5 hover:border-brand">
                  {p.settings?.kicker ? <Eyebrow className="text-neutral-400">{String(p.settings.kicker)}</Eyebrow> : null}
                  <span className="font-semibold text-brand">{it.title} →</span>
                </SmartLink>
              </li>
            ))}
          </ul>
        </Band>
      );

    case "logoStrip":
      return (
        <section id={p.id} className="border-y border-neutral-200 bg-white">
          <ul className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-center gap-10 px-4 py-8 sm:px-8">
            {p.items.map((it) => (
              <li key={it.id} className="h-16 w-28">
                {it.logo ? <Image src={it.logo.url} alt={it.title} width={112} height={64} className="h-full w-full object-contain" /> : <span className="text-sm">{it.title}</span>}
              </li>
            ))}
          </ul>
        </section>
      );

    case "brandDirectory":
      return (
        <Band tone={tone} id={p.id}>
          {head ? <div className="mb-10">{head}</div> : null}
          <div className="flex flex-col gap-12">
            {p.items.map((group) => (
              <div key={group.id}>
                <Heading level="h3" size="sm" className="mb-5 text-brand">{group.title}</Heading>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                  {(group.brands ?? []).map((b) => (
                    <li key={b.id}>
                      <SmartLink href={b.href ?? "#"} className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-4 hover:border-brand">
                        {b.logo ? <Image src={b.logo.url} alt={b.name} width={120} height={120} className="h-20 w-20 object-contain" /> : null}
                        <span className="text-sm font-medium">{b.name}</span>
                        {p.settings?.showCounts && b.productCountLabel ? <span className="text-xs text-neutral-500">{b.productCountLabel}</span> : null}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Band>
      );

    case "jurisdictionList":
      return (
        <Band tone={tone} id={p.id}>
          <div className="mb-6 flex items-baseline justify-between">
            <Heading level="h2" size="md" className="text-brand">{p.heading}</Heading>
            <span className="text-sm text-neutral-500">{p.items.length} jurisdictions</span>
          </div>
          <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
            {p.items.map((j) => (
              <li key={j.id} className="grid gap-2 py-6 sm:grid-cols-[200px_1fr_180px]">
                <span className="font-heading text-xl font-bold text-brand">{j.title}</span>
                <span className="text-neutral-700">{j.regulator ? <span className="block text-sm text-neutral-500">{j.regulator}</span> : null}{j.richBody ? <RichText document={j.richBody} className="text-base" /> : null}</span>
                <span className="text-sm text-neutral-500 sm:text-right">{j.licenceNumber}</span>
              </li>
            ))}
          </ul>
          {p.disclaimer ? <p className="mt-6 text-sm text-neutral-500">{p.disclaimer}</p> : null}
        </Band>
      );

    case "testimonialCarousel":
      return (
        <Band tone={tone} id={p.id}>
          {p.eyebrow ? <p className="mb-2 font-heading text-xs font-bold uppercase tracking-[0.12em] text-brand after:mt-1 after:block after:h-0.5 after:w-14 after:bg-brand-sky">{p.eyebrow}</p> : null}
          {p.heading ? <Heading level="h2" size="lg" className="mb-10 text-brand">{p.heading}</Heading> : null}
          <ul className="flex snap-x gap-6 overflow-x-auto pb-2 lg:grid lg:grid-cols-3">
            {p.items.map((t) => (
              <li key={t.id} className="flex min-w-[320px] snap-start flex-col justify-between gap-8 rounded-3xl bg-brand-tint p-8">
                <blockquote className="font-heading text-2xl font-bold leading-snug text-brand">“{t.quote}”</blockquote>
                <footer className="border-t border-brand-sky pt-4 text-sm">
                  <span className="block font-medium text-brand">{(t.attribution ?? "").split(" · ")[0]}</span>
                  <span className="font-heading text-xs font-bold uppercase tracking-wide text-neutral-700">{(t.attribution ?? "").split(" · ").slice(1).join(" · ")}</span>
                </footer>
              </li>
            ))}
          </ul>
        </Band>
      );

    default:
      return null;
  }
}
