import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

/* ---- Structural CMS types the UI reads. They mirror @repo/contentful but keep this package CMS-agnostic. ---- */
export interface CmsImage { url: string; width?: number | null; height?: number | null; description?: string | null; title?: string | null }
export interface CmsImageGroup { image?: CmsImage | null; imageMobile?: CmsImage | null; altText?: string; imageDecorative?: boolean }
export interface CmsHeadingGroup { eyebrow?: string; heading?: string; headingLevel?: "h1" | "h2" | "h3" | "h4"; body?: string | RichTextDoc }
export interface RichTextDoc { nodeType: "document"; content: unknown[] }
export interface CmsCta { label: string; href: string; variant?: "primary" | "secondary" | "ghost" | "tertiary" | "action" | "danger"; size?: "small" | "medium" | "large"; icon?: string; iconPosition?: "left" | "right"; newTab?: boolean }

export function isExternal(href: string) {
  // Absolute URLs, and /api/* routes that redirect to Shopify (Link's client fetch would hit them as CORS requests).
  return /^https?:\/\//.test(href) || href.startsWith("/api/");
}

export function SmartLink({ href, className, children, newTab, ...rest }: { href: string; className?: string; children: ReactNode; newTab?: boolean; "aria-label"?: string }) {
  if (isExternal(href) || newTab) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}

/* ---- CTA button: Figma "Button" (primary / secondary / ghost / tertiary / action / danger, 3 sizes). Labels are uppercased by the component. ---- */
const CTA_VARIANT: Record<NonNullable<CmsCta["variant"]>, string> = {
  primary: "bg-brand text-brand-fg hover:opacity-90",
  secondary: "border border-current bg-transparent text-inherit hover:bg-black/5",
  ghost: "bg-transparent text-inherit underline-offset-4 hover:underline",
  tertiary: "bg-brand-tint text-brand hover:bg-brand-tint/70",
  action: "bg-accent text-accent-fg hover:opacity-90",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const CTA_SIZE: Record<NonNullable<CmsCta["size"]>, string> = {
  small: "px-4 py-1.5 text-[11px]",
  medium: "px-6 py-3 text-xs",
  large: "px-8 py-3.5 text-sm",
};

export function CtaButton({ cta, className = "" }: { cta: CmsCta; className?: string }) {
  const icon = cta.icon && cta.icon !== "none" ? <Icon name={cta.icon} className="h-4 w-4" /> : null;
  return (
    <SmartLink
      href={cta.href}
      newTab={cta.newTab}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-heading font-bold uppercase tracking-wide transition ${CTA_VARIANT[cta.variant ?? "primary"]} ${CTA_SIZE[cta.size ?? "medium"]} ${className}`}
    >
      {cta.iconPosition === "left" ? icon : null}
      {cta.label}
      {cta.iconPosition !== "left" ? icon : null}
    </SmartLink>
  );
}

export function CtaRow({ ctas, className = "" }: { ctas: CmsCta[]; className?: string }) {
  if (ctas.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {ctas.map((cta, i) => <CtaButton key={`${cta.label}-${i}`} cta={cta} />)}
    </div>
  );
}

/* ---- Heading group: eyebrow + heading (semantic level from CMS, visual size from the component) + body ---- */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`font-heading text-xs font-bold uppercase tracking-[0.12em] ${className}`}>{children}</p>;
}

export function Heading({ level = "h2", size = "lg", className = "", children }: { level?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"; size?: "xl" | "lg" | "md" | "sm" | "xs"; className?: string; children: ReactNode }) {
  const Tag = level;
  const sizes = { xl: "text-5xl sm:text-6xl", lg: "text-4xl sm:text-5xl", md: "text-3xl sm:text-4xl", sm: "text-2xl", xs: "text-xl" };
  return <Tag className={`font-heading font-bold leading-[0.95] tracking-tight ${sizes[size]} ${className}`}>{children}</Tag>;
}

export function HeadingGroup({ group, size = "lg", align = "left", tone = "default", className = "" }: { group: CmsHeadingGroup; size?: "xl" | "lg" | "md" | "sm"; align?: "left" | "center"; tone?: "default" | "inverse"; className?: string }) {
  const eyebrowTone = tone === "inverse" ? "text-accent" : "text-brand";
  const headingTone = tone === "inverse" ? "text-white" : "text-brand";
  const bodyTone = tone === "inverse" ? "text-white/85" : "text-neutral-600";
  const body = typeof group.body === "string" ? group.body : null;
  return (
    <div className={`flex flex-col gap-3 ${align === "center" ? "items-center text-center" : ""} ${className}`}>
      {group.eyebrow ? <Eyebrow className={eyebrowTone}>{group.eyebrow}</Eyebrow> : null}
      {group.heading ? <Heading level={group.headingLevel ?? "h2"} size={size} className={headingTone}>{group.heading}</Heading> : null}
      {body ? <p className={`max-w-2xl text-base leading-relaxed sm:text-lg ${bodyTone}`}>{body}</p> : null}
    </div>
  );
}

/* ---- Responsive image with mobile art direction ---- */
export function CmsPicture({ group, className = "", sizes = "100vw", priority = false, fill = true }: { group: CmsImageGroup; className?: string; sizes?: string; priority?: boolean; fill?: boolean }) {
  const img = group.image;
  if (!img) return null;
  const alt = group.imageDecorative ? "" : (group.altText ?? img.description ?? img.title ?? "");
  const mobile = group.imageMobile;
  return (
    <picture className={`block ${fill ? "absolute inset-0" : ""} ${className}`}>
      {mobile ? <source media="(max-width: 640px)" srcSet={mobile.url} /> : null}
      <Image src={img.url} alt={alt} fill={fill} width={fill ? undefined : (img.width ?? 1200)} height={fill ? undefined : (img.height ?? 800)} sizes={sizes} priority={priority} className={`${fill ? "object-cover" : "h-auto w-full"}`} />
    </picture>
  );
}

/* ---- Section shell ---- */
export function Band({ children, tone = "white", className = "", id }: { children: ReactNode; tone?: "white" | "tint" | "navy" | "sky" | "grey" | "black" | "light"; className?: string; id?: string }) {
  const tones = {
    white: "bg-white text-neutral-900",
    tint: "bg-brand-tint text-neutral-900",
    navy: "bg-brand text-white",
    sky: "bg-brand-sky text-brand",
    grey: "bg-neutral-100 text-neutral-900",
    black: "bg-neutral-900 text-white",
    light: "bg-white text-neutral-900",
  };
  return (
    <section id={id} className={`${tones[tone]} ${className}`}>
      <div className="mx-auto max-w-[1360px] px-4 py-14 sm:px-8 sm:py-20">{children}</div>
    </section>
  );
}

/* ---- Icon set (stays in code per the spec) ---- */
const ICON_PATHS: Record<string, string> = {
  package: "M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Zm9 4.5v9M3 7.5 12 12l9-4.5",
  coinStack: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  calendar: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  dollarCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v10m3-7.5c0-1-1.3-1.5-3-1.5s-3 .6-3 1.6c0 2.4 6 1 6 3.4 0 1-1.3 1.7-3 1.7s-3-.7-3-1.7",
  bookHeart: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm0 14a2 2 0 0 0 2 2h13M12 13l-2.5-2.5a1.8 1.8 0 0 1 2.5-2.6 1.8 1.8 0 0 1 2.5 2.6L12 13Z",
  building: "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h2m-2 4h2m-2 4h2",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0V4Zm-4 1h4v3a3 3 0 0 1-3-3Zm16 0h-4v3a3 3 0 0 0 3-3ZM12 13v4m-4 4h8m-4-4a4 4 0 0 0 4-4",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  arrowRight: "M5 12h14m-6-6 6 6-6 6",
  play: "M7 5v14l11-7L7 5Z",
  cart: "M3 4h2l2.5 11h11L21 7H7M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  plus: "M12 5v14M5 12h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4.3-4.3",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  chevronDown: "M6 9l6 6 6-6",
  pin: "M12 21s-6-5.3-6-11a6 6 0 1 1 12 0c0 5.7-6 11-6 11Zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
};

export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const d = ICON_PATHS[name] ?? ICON_PATHS.package;
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}
