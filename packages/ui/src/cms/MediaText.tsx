import Image from "next/image";
import { Band, CmsPicture, CtaButton, HeadingGroup, Icon, type CmsCta, type CmsHeadingGroup, type CmsImage, type CmsImageGroup } from "./primitives";

export interface BrandLogo { id: string; name: string; logo: CmsImage | null; href?: string }
export interface FeatureItem { id: string; icon?: string; title: string; body?: string }

export interface MediaTextProps extends CmsHeadingGroup, CmsImageGroup {
  variant: "mediaText" | "logoGroupText" | "referralHero";
  mediaType?: "video" | "image" | "brandCollage";
  video?: string;
  videoCaption?: string;
  brands?: BrandLogo[];
  features?: FeatureItem[];
  cta?: CmsCta | null;
  mediaPosition?: "left" | "right";
  style?: "white" | "tint" | "navy";
}

function LogoTile({ b, className = "" }: { b: BrandLogo; className?: string }) {
  const inner = b.logo ? <Image src={b.logo.url} alt={b.name} width={160} height={160} className="h-full w-full object-contain p-4" /> : <span className="p-4 text-center text-sm font-semibold">{b.name}</span>;
  const cls = `flex aspect-square items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm ${className}`;
  return b.href ? <a href={b.href} className={cls} aria-label={b.name}>{inner}</a> : <div className={cls}>{inner}</div>;
}

/**
 * Three bands share this component: the video / explainer band (mediaText), "Who backs it"
 * (logoGroupText) and the DC referral hero (referralHero).
 */
export function MediaText(p: MediaTextProps) {
  const tone = p.style === "navy" ? "navy" : p.style === "tint" ? "tint" : "white";
  const inverse = tone === "navy";
  const mediaRight = p.mediaPosition === "right";

  if (p.variant === "logoGroupText") {
    return (
      <Band tone={tone}>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <HeadingGroup group={p} size="md" tone={inverse ? "inverse" : "default"} />
          {p.brands?.length ? (
            <div className="grid grid-cols-3 gap-4">
              {p.brands.map((b) => <LogoTile key={b.id} b={b} />)}
            </div>
          ) : null}
        </div>
      </Band>
    );
  }

  if (p.variant === "referralHero") {
    return (
      <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8">
        <div className={`grid overflow-hidden rounded-3xl bg-brand text-white lg:grid-cols-2 ${mediaRight ? "lg:[&>*:first-child]:order-2" : ""}`}>
          <div className="relative min-h-[320px]">
            <CmsPicture group={p} sizes="(min-width: 1024px) 680px, 100vw" />
          </div>
          <div className="flex flex-col justify-center gap-5 p-8 sm:p-12">
            {p.eyebrow ? <p className="font-heading text-xs font-bold uppercase tracking-[0.12em] text-accent after:mt-1 after:block after:h-0.5 after:w-12 after:bg-accent">{p.eyebrow}</p> : null}
            <HeadingGroup group={{ ...p, eyebrow: undefined }} size="xl" tone="inverse" />
            {p.cta ? <CtaButton cta={{ ...p.cta, variant: p.cta.variant === "primary" ? "secondary" : p.cta.variant }} className="self-start text-white" /> : null}
          </div>
        </div>
      </section>
    );
  }

  // mediaText: video band, image explainer or brand collage
  const media =
    p.mediaType === "brandCollage" && p.brands?.length ? (
      <div className="grid grid-cols-3 gap-4">
        {p.brands.slice(0, 9).map((b, i) => <LogoTile key={b.id} b={b} className={i % 3 === 1 ? "translate-y-6" : ""} />)}
      </div>
    ) : (
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-neutral-200 sm:aspect-[3/2]">
        <CmsPicture group={p} sizes="(min-width: 1024px) 720px, 100vw" />
        {p.mediaType === "video" ? (
          <a href={p.video ?? "#"} target={p.video ? "_blank" : undefined} rel="noopener noreferrer" className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white" aria-label={p.videoCaption ?? "Play video"}>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg"><Icon name="play" className="h-7 w-7 fill-current" /></span>
            {p.videoCaption ? <span className="font-heading text-xs font-bold uppercase tracking-wide drop-shadow">{p.videoCaption}</span> : null}
          </a>
        ) : null}
      </div>
    );

  return (
    <Band tone={tone}>
      <div className={`grid items-center gap-10 lg:grid-cols-2 ${mediaRight ? "lg:[&>*:first-child]:order-2" : ""}`}>
        {media}
        <div className="flex flex-col gap-6">
          <HeadingGroup group={p} size="lg" tone={inverse ? "inverse" : "default"} />
          {p.features?.length ? (
            <ul className="grid gap-5 sm:grid-cols-2">
              {p.features.map((f) => (
                <li key={f.id} className="flex items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand"><Icon name={f.icon ?? "package"} className="h-7 w-7" /></span>
                  <span className="flex flex-col"><span className="font-semibold text-brand">{f.title}</span>{f.body ? <span className="text-sm text-neutral-600">{f.body}</span> : null}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {p.cta ? <CtaButton cta={p.cta} className="self-start" /> : null}
        </div>
      </div>
    </Band>
  );
}
