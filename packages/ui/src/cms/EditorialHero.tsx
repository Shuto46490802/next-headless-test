import { Band, CmsPicture, Eyebrow, Heading, Icon, type CmsHeadingGroup, type CmsImageGroup, type RichTextDoc } from "./primitives";
import { RichText } from "./RichText";

export interface EditorialHeroProps extends CmsHeadingGroup, CmsImageGroup {
  layout?: "split" | "textOnly" | "fullBleed";
  searchPlaceholder?: string;
  version?: string;
}

/** Figma "Page head": eyebrow, H1, intro copy, optional wide image; help centre adds a search box. */
export function EditorialHero(p: EditorialHeroProps) {
  const body = p.body;
  const text = (
    <div className="flex max-w-3xl flex-col gap-4">
      {p.eyebrow ? <Eyebrow className="text-brand">{p.eyebrow}</Eyebrow> : null}
      {p.heading ? <Heading level={p.headingLevel ?? "h1"} size="xl" className="text-brand">{p.heading}</Heading> : null}
      {typeof body === "string" ? <p className="text-lg text-neutral-600">{body}</p> : body ? <RichText document={body as RichTextDoc} className="text-lg" /> : null}
      {p.version ? <p className="text-sm text-neutral-500">Version {p.version}</p> : null}
      {p.searchPlaceholder ? (
        <form action="/faqs" className="mt-2 flex max-w-xl items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-3">
          <Icon name="search" className="h-5 w-5 text-neutral-500" />
          <input name="q" type="search" placeholder={p.searchPlaceholder} className="w-full bg-transparent text-base outline-none" />
        </form>
      ) : null}
    </div>
  );
  if (p.layout === "fullBleed" && p.image) {
    return (
      <section className="relative min-h-[420px] overflow-hidden bg-brand text-white">
        <CmsPicture group={p} sizes="100vw" priority />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative mx-auto max-w-[1360px] px-4 py-24 sm:px-8 [&_.text-brand]:text-white [&_p]:text-white/85">{text}</div>
      </section>
    );
  }
  return (
    <Band tone="tint">
      <div className={`grid items-center gap-10 ${p.layout !== "textOnly" && p.image ? "lg:grid-cols-2" : ""}`}>
        {text}
        {p.layout !== "textOnly" && p.image ? (
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl">
            <CmsPicture group={p} sizes="(min-width: 1024px) 640px, 100vw" priority />
          </div>
        ) : null}
      </div>
    </Band>
  );
}
