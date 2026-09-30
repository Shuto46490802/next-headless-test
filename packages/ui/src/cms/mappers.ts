import type {
  Article, Brand, Cta, CtaBandSection, EditorialHeroSection, Faq, FaqAccordionSection, HeroCarouselSection, HeroSlide, ImageGroup, ItemListSection, Jurisdiction, ListItem,
  MediaTextSection, NavigationItem, ProductRailSection, PromoTile as PromoTileEntry, SiteSettings, Testimonial,
} from "@repo/contentful";
import { ctaHref, isVisible, resolveHref, type VisibilityContext } from "@repo/contentful";
import type { CmsCta, CmsImage } from "./primitives";
import type { HeroSlideData } from "./HeroCarousel";
import type { ListItemData, ItemListProps } from "./ItemList";
import type { PromoTileProps, FaqAccordionProps, ArticleCard } from "./misc";
import type { MediaTextProps } from "./MediaText";
import type { CtaBandProps } from "./CtaBand";
import type { EditorialHeroProps } from "./EditorialHero";
import type { NavItemData } from "../components/SiteHeader";
import type { SiteFooterProps } from "../components/SiteFooter";

/**
 * Pure mappers from Contentful entries (resolved by @repo/contentful) to the structural props of
 * the CMS components. Shared by the apps' section registry and by Storybook, so a story renders a
 * band exactly as the storefront would.
 */
export function toCta(c: Cta | null | undefined): CmsCta | null {
  if (!c) return null;
  return { label: c.label, href: ctaHref(c), variant: c.variant, size: c.size, icon: c.icon, iconPosition: c.iconPosition, newTab: c.link?.newTab };
}
export const toCtas = (list: (Cta | null)[] | undefined) => (list ?? []).map(toCta).filter((c): c is CmsCta => c !== null);
export const toImageGroup = (g: ImageGroup) => ({ image: g.image ?? null, imageMobile: g.imageMobile ?? null, altText: g.altText, imageDecorative: g.imageDecorative });
export const toBrandLogo = (b: Brand) => ({ id: b.id, name: b.name, logo: b.logo, href: resolveHref(b.link), productCountLabel: b.productCountLabel });
export const toLink = (l: { label?: string; internalName?: string } & Parameters<typeof resolveHref>[0]) => ({ label: l?.label ?? l?.internalName ?? "", href: resolveHref(l) });
const textBody = (b: unknown) => (typeof b === "string" ? b : undefined);

export function toPromoTile(p: PromoTileEntry | null | undefined): PromoTileProps | null {
  return p ? { eyebrow: p.eyebrow, heading: p.heading, headingLevel: p.headingLevel, body: textBody(p.body), cta: toCta(p.cta), style: p.style, hue: p.hue, ...toImageGroup(p) } : null;
}

export function toListItem(it: ListItem | Testimonial | Jurisdiction | Brand): ListItemData {
  switch (it.contentType) {
    case "testimonial": return { id: it.id, kind: "testimonial", title: it.attribution, quote: it.quote, attribution: it.attribution };
    case "jurisdiction": return { id: it.id, kind: "jurisdiction", title: it.name, regulator: it.regulator, licenceNumber: it.licenceNumber, richBody: it.body ?? null };
    case "brand": return { id: it.id, kind: "brand", title: it.name, logo: it.logo, href: resolveHref(it.link), productCountLabel: it.productCountLabel };
    default:
      return {
        id: it.id, kind: "item", type: it.type, title: it.title, eyebrow: it.eyebrow, body: it.body, value: it.value, icon: it.icon,
        href: it.link ? resolveHref(it.link) : undefined, cta: toCta(it.cta), brands: (it.brands ?? []).map(toBrandLogo), ...toImageGroup(it),
      };
  }
}

export function toHeroSlides(s: HeroCarouselSection, vis: VisibilityContext): HeroSlideData[] {
  return s.slides.filter((sl: HeroSlide) => isVisible(sl, vis)).map((sl) => ({
    id: sl.id, eyebrow: sl.eyebrow, heading: sl.heading, headingLevel: sl.headingLevel, bodyMobile: sl.bodyMobile, image: sl.image, imageMobile: sl.imageMobile,
    altText: sl.altText, type: sl.type, hue: sl.hue, ctas: toCtas(sl.ctas), slideLabel: sl.slideLabel,
  }));
}
export const toEditorialHero = (s: EditorialHeroSection): EditorialHeroProps => ({ ...s, ...toImageGroup(s) });
export const toCtaBand = (s: CtaBandSection): CtaBandProps => ({ ...s, body: textBody(s.body), ctas: toCtas(s.ctas) });
export const toMediaText = (s: MediaTextSection): MediaTextProps => ({
  ...s, ...toImageGroup(s), body: textBody(s.body), brands: (s.brands ?? []).map(toBrandLogo),
  features: (s.features ?? []).map((f) => ({ id: f.id, icon: f.icon, title: f.title, body: f.body })), cta: toCta(s.cta),
});
export function toItemList(s: ItemListSection, siteLogo?: CmsImage | null): ItemListProps {
  const fa = s.featuredArticle;
  return {
    id: s.id, layout: s.layout, style: s.style, eyebrow: s.eyebrow, heading: s.heading, headingLevel: s.headingLevel, body: textBody(s.body),
    items: s.items.map(toListItem), cta: toCta(s.cta), link: s.link ? toLink(s.link) : null, featuredLabel: s.featuredLabel,
    featuredArticle: fa ? { title: fa.title, href: `/stories/${fa.slug}`, standfirst: fa.standfirst, category: fa.category, image: fa.heroImage ?? null } : null,
    disclaimer: s.disclaimer, settings: s.settings, siteLogo,
  };
}
export const toFaqAccordion = (s: FaqAccordionSection, vis: VisibilityContext): FaqAccordionProps => ({
  id: s.id, eyebrow: s.eyebrow, heading: s.heading, headingLevel: s.headingLevel, body: textBody(s.body),
  faqs: s.faqs.filter((f: Faq) => isVisible(f, vis)).map((f) => ({ id: f.id, question: f.question, answer: f.answer, cta: toCta(f.cta), defaultOpen: f.defaultOpen })),
  link: s.link ? toLink(s.link) : null, style: s.style,
});
/** The non-product part of a rail; the caller adds `products` from Shopify. */
export const toProductRailStatic = (s: ProductRailSection) => ({
  id: s.id, heading: s.heading, link: s.link ? toLink(s.link) : null,
  tabs: (s.tabs ?? []).map((t) => ({ id: t.id, label: t.title, handle: t.shopifyHandle ?? t.value ?? "" })),
  promoTile: toPromoTile(s.promoTile), promoPosition: s.promoPosition, limit: s.limit ?? 4, source: s.source, shopifyHandle: s.shopifyHandle,
});
export const toArticleCard = (a: Article): ArticleCard => ({ id: a.id, title: a.title, href: `/stories/${a.slug}`, category: a.category, location: a.location, standfirst: a.standfirst, readTimeMinutes: a.readTimeMinutes, image: a.heroImage ?? null, badge: a.badge });

export function toNavigation(items: NavigationItem[] | undefined): NavItemData[] {
  return (items ?? []).map((n) => ({
    id: n.id, label: n.label, href: n.link ? resolveHref(n.link) : null,
    columns: (n.columns ?? []).map((c) => ({ id: c.id, heading: c.heading, links: c.links.map(toLink) })),
    brands: (n.brands ?? []).map(toBrandLogo), promo: toPromoTile(n.promoTile), footerLink: n.footerLink ? toLink(n.footerLink) : null,
  }));
}
export function toFooter(s: SiteSettings | null): Omit<SiteFooterProps, "brand" | "logo"> | null {
  return s
    ? {
        columns: (s.footerColumns ?? []).map((c) => ({ id: c.id, heading: c.heading, links: c.links.map(toLink) })),
        text: s.footerText ?? null, socialLinks: (s.socialLinks ?? []).map(toLink), bottomBarLeft: s.bottomBarLeft ?? null, bottomBarRight: s.bottomBarRight ?? null,
      }
    : null;
}
export function toLoggedOutNav(s: SiteSettings | null) {
  return (s?.loggedOutNavigation ?? []).map((l) => ({ label: l.label ?? l.internalName, href: l.linkType === "anchor" ? `/gate#${l.url ?? ""}` : resolveHref(l) }));
}
