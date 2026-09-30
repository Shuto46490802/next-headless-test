import Image from "next/image";
import { Band, CmsPicture, CtaButton, Eyebrow, Heading, HeadingGroup, SmartLink, type CmsCta, type CmsHeadingGroup, type CmsImage, type CmsImageGroup, type RichTextDoc } from "./primitives";
import { RichText } from "./RichText";

/* ---- Promo tile: one slot in a rail, mega-nav promo, or standalone section ---- */
export interface PromoTileProps extends CmsHeadingGroup, CmsImageGroup {
  cta: CmsCta | null;
  style?: "inverted" | "poster" | "collage" | "statement";
  hue?: string;
  className?: string;
}
const HUES: Record<string, string> = { orange: "#F26B1D", purple: "#6B3FA0", orchid: "#C05AA8", pink: "#F07CA6", yellow: "#F5C518", lime: "#A6CE39", sky: "#4FB3E8" };

export function PromoTile(p: PromoTileProps) {
  const statement = p.style === "statement";
  const bg = statement && p.hue && HUES[p.hue] ? { backgroundColor: HUES[p.hue] } : undefined;
  const dark = !statement;
  return (
    <div className={`relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl ${dark ? "bg-neutral-900 text-white" : "bg-accent text-neutral-900"} ${p.className ?? ""}`} style={bg}>
      {p.image && p.style !== "statement" ? <CmsPicture group={p} sizes="360px" /> : null}
      {dark ? <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" /> : null}
      <div className={`relative flex flex-col gap-3 p-7 ${p.style === "poster" ? "" : "items-center text-center"}`}>
        {p.eyebrow ? <Eyebrow className={dark ? "text-white/80" : "text-neutral-800"}>{p.eyebrow}</Eyebrow> : null}
        {p.heading ? <Heading level={p.headingLevel ?? "h3"} size="md">{p.heading}</Heading> : null}
        {typeof p.body === "string" && p.body ? <p className={`text-sm ${dark ? "text-white/85" : "text-neutral-800"}`}>{p.body}</p> : null}
        {p.cta ? <CtaButton cta={{ ...p.cta, variant: dark ? "secondary" : "primary", size: "small" }} className={`mt-2 ${dark ? "text-white" : ""}`} /> : null}
      </div>
    </div>
  );
}

/* ---- FAQ accordion: one open at a time via <details name> ---- */
export interface FaqData { id: string; question: string; answer: RichTextDoc; cta?: CmsCta | null; defaultOpen?: boolean }
export interface FaqAccordionProps extends CmsHeadingGroup { id: string; faqs: FaqData[]; link?: { label: string; href: string } | null; style?: "white" | "tint" | "grey" }

export function FaqAccordion(p: FaqAccordionProps) {
  return (
    <Band tone={p.style === "tint" ? "tint" : p.style === "grey" ? "grey" : "white"} id={p.id}>
      <div className="grid gap-10 lg:grid-cols-[1fr_3fr]">
        <div className="flex flex-col gap-4">
          <HeadingGroup group={p} size="lg" />
          {p.link ? <SmartLink href={p.link.href} className="text-brand underline underline-offset-4">{p.link.label}</SmartLink> : null}
        </div>
        <div className="divide-y divide-neutral-200 border-b border-neutral-200">
          {p.faqs.map((f) => (
            <details key={f.id} name={`faq-${p.id}`} open={f.defaultOpen} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium text-neutral-900 [&::-webkit-details-marker]:hidden">
                {f.question}
                <span className="text-2xl text-brand group-open:hidden">+</span>
                <span className="hidden text-2xl text-brand group-open:inline">−</span>
              </summary>
              <div className="pt-3">
                <RichText document={f.answer} />
                {f.cta ? <CtaButton cta={{ ...f.cta, variant: "ghost", size: "small" }} className="mt-3 text-brand" /> : null}
              </div>
            </details>
          ))}
        </div>
      </div>
    </Band>
  );
}

/* ---- Ruled two-column rich text ---- */
export function RichTextRuled({ id, sideLabel, body }: { id: string; sideLabel?: string; body: RichTextDoc }) {
  return (
    <Band tone="white" id={id}>
      <div className="grid gap-8 border-t border-neutral-200 pt-10 lg:grid-cols-[1fr_3fr]">
        <Eyebrow className="text-brand">{sideLabel}</Eyebrow>
        <RichText document={body} className="max-w-3xl text-lg" />
      </div>
    </Band>
  );
}

/* ---- Article grid (presentational; the app fetches the articles) ---- */
export interface ArticleCard { id: string; title: string; href: string; category?: string; location?: string; standfirst?: string; readTimeMinutes?: number; image?: CmsImage | null; badge?: string }
export function ArticleGrid({ id, articles, categories, activeCategory, total }: { id: string; articles: ArticleCard[]; categories?: string[]; activeCategory?: string; total?: number }) {
  return (
    <Band tone="white" id={id}>
      {categories?.length ? (
        <ul className="mb-8 flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c}>
              <SmartLink href={c === "All" ? "?" : `?category=${encodeURIComponent(c)}`} className={`rounded-full border px-4 py-1.5 text-sm ${(activeCategory ?? "All") === c ? "border-brand bg-brand text-white" : "border-neutral-300 text-neutral-700 hover:border-brand"}`}>{c}</SmartLink>
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((a) => (
          <li key={a.id}>
            <SmartLink href={a.href} className="group flex flex-col gap-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100">
                {a.image ? <Image src={a.image.url} alt="" fill sizes="(min-width: 1024px) 320px, 50vw" className="object-cover transition group-hover:scale-105" /> : null}
                {a.badge && a.badge !== "none" ? <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 font-heading text-xs font-bold uppercase text-accent-fg">{a.badge}</span> : null}
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-brand">{[a.category, a.location].filter(Boolean).join(" · ")}</span>
              <span className="font-heading text-xl font-bold text-neutral-900 group-hover:text-brand">{a.title}</span>
              {a.standfirst ? <span className="text-sm text-neutral-600">{a.standfirst}</span> : null}
              {a.readTimeMinutes ? <span className="text-xs text-neutral-500">{a.readTimeMinutes} min read</span> : null}
            </SmartLink>
          </li>
        ))}
      </ul>
      {total && total > articles.length ? <p className="mt-8 text-center text-sm text-neutral-500">Showing {articles.length} of {total}</p> : null}
    </Band>
  );
}

/* ---- Data table ---- */
export function DataTable({ id, heading, columns, rows, footnote }: { id: string; heading: string; columns: string[]; rows: string[][]; footnote?: string }) {
  return (
    <Band tone="white" id={id}>
      <Heading level="h2" size="md" className="mb-6 text-brand">{heading}</Heading>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-neutral-300">{columns.map((c) => <th key={c} className="py-3 pr-6 font-semibold">{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-neutral-200">{r.map((cell, j) => <td key={j} className="py-3 pr-6 text-neutral-700">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {footnote ? <p className="mt-4 text-sm text-neutral-500">{footnote}</p> : null}
    </Band>
  );
}
