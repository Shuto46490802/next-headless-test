import type {
  Article, Brand, Cta, Faq, HeroSlide, ImageGroup, ItemListSection, Jurisdiction, ListItem, NavigationItem, PageSection, PromoTile as PromoTileEntry, SiteSettings, Testimonial,
} from "@repo/contentful";
import { ctaHref, isVisible, resolveHref } from "@repo/contentful";
import {
  ArticleGrid, Band, CtaBand, DataTable, EditorialHero, FaqAccordion, HeroCarousel, ItemList, MediaText, ProductRail, PromoTile, RichTextRuled,
  type CmsCta, type CmsImage, type ListItemData, type NavItemData, type PromoTileProps,
} from "@repo/ui";
import { contentful } from "../lib/contentful";
import { storefront } from "../lib/shopify";

export interface SectionContext {
  isLoggedIn: boolean;
  favouriteIds: ReadonlySet<string>;
  showPoints: boolean;
  preview: boolean;
  siteLogo?: CmsImage | null;
  /** Query string, for rail tabs (?rail=handle) and article filters (?category=). */
  searchParams: Record<string, string | undefined>;
  /** Fallback collection for a rail with no handle set. */
  defaultCollectionHandle?: string;
}

/* ---- mappers from Contentful entries to the UI package's structural props ---- */
export function toCta(c: Cta | null | undefined): CmsCta | null {
  if (!c) return null;
  return { label: c.label, href: ctaHref(c), variant: c.variant, size: c.size, icon: c.icon, iconPosition: c.iconPosition, newTab: c.link?.newTab };
}
const ctas = (list: (Cta | null)[] | undefined) => (list ?? []).map(toCta).filter((c): c is CmsCta => c !== null);
const img = (g: ImageGroup) => ({ image: g.image ?? null, imageMobile: g.imageMobile ?? null, altText: g.altText, imageDecorative: g.imageDecorative });
const brandLogo = (b: Brand) => ({ id: b.id, name: b.name, logo: b.logo, href: resolveHref(b.link), productCountLabel: b.productCountLabel });
const promo = (p: PromoTileEntry | null | undefined): PromoTileProps | null =>
  p ? { eyebrow: p.eyebrow, heading: p.heading, headingLevel: p.headingLevel, body: typeof p.body === "string" ? p.body : undefined, cta: toCta(p.cta), style: p.style, hue: p.hue, ...img(p) } : null;

function listItem(it: ListItem | Testimonial | Jurisdiction | Brand): ListItemData {
  switch (it.contentType) {
    case "testimonial":
      return { id: it.id, kind: "testimonial", title: it.attribution, quote: it.quote, attribution: it.attribution };
    case "jurisdiction":
      return { id: it.id, kind: "jurisdiction", title: it.name, regulator: it.regulator, licenceNumber: it.licenceNumber, richBody: it.body ?? null };
    case "brand":
      return { id: it.id, kind: "brand", title: it.name, logo: it.logo, href: resolveHref(it.link), productCountLabel: it.productCountLabel };
    default:
      return {
        id: it.id, kind: "item", type: it.type, title: it.title, eyebrow: it.eyebrow, body: it.body, value: it.value, icon: it.icon,
        href: it.link ? resolveHref(it.link) : undefined, cta: toCta(it.cta), brands: (it.brands ?? []).map(brandLogo), ...img(it),
      };
  }
}

export function toNavigation(items: NavigationItem[] | undefined): NavItemData[] {
  return (items ?? []).map((n) => ({
    id: n.id,
    label: n.label,
    href: n.link ? resolveHref(n.link) : null,
    columns: (n.columns ?? []).map((c) => ({ id: c.id, heading: c.heading, links: c.links.map((l) => ({ label: l.label ?? l.internalName, href: resolveHref(l) })) })),
    brands: (n.brands ?? []).map(brandLogo),
    promo: promo(n.promoTile),
    footerLink: n.footerLink ? { label: n.footerLink.label ?? "", href: resolveHref(n.footerLink) } : null,
  }));
}
export function toFooter(s: SiteSettings | null) {
  return s
    ? {
        columns: (s.footerColumns ?? []).map((c) => ({ id: c.id, heading: c.heading, links: c.links.map((l) => ({ label: l.label ?? l.internalName, href: resolveHref(l) })) })),
        text: s.footerText ?? null,
        socialLinks: (s.socialLinks ?? []).map((l) => ({ label: l.label ?? l.internalName, href: resolveHref(l) })),
        bottomBarLeft: s.bottomBarLeft ?? null,
        bottomBarRight: s.bottomBarRight ?? null,
      }
    : null;
}

/**
 * The storefront's section registry: one case per Contentful section type, like a theme's
 * sections folder. Adding a section = a content type in Contentful, a type in @repo/contentful,
 * a component in @repo/ui and a case here.
 */
export async function Section({ section, ctx }: { section: PageSection; ctx: SectionContext }) {
  const vis = { isLoggedIn: ctx.isLoggedIn };
  switch (section.contentType) {
    case "heroCarousel": {
      const slides = section.slides.filter((s: HeroSlide) => isVisible(s, vis)).map((s) => ({
        id: s.id, eyebrow: s.eyebrow, heading: s.heading, headingLevel: s.headingLevel, bodyMobile: s.bodyMobile, image: s.image, imageMobile: s.imageMobile,
        altText: s.altText, type: s.type, hue: s.hue, ctas: ctas(s.ctas), slideLabel: s.slideLabel,
      }));
      return <HeroCarousel slides={slides} evergreenTiles={ctas(section.evergreenTiles)} />;
    }
    case "hero":
      return <EditorialHero {...section} {...img(section)} />;
    case "ctaBand":
      if (!isVisible(section, vis)) return null;
      return <CtaBand {...section} body={typeof section.body === "string" ? section.body : undefined} ctas={ctas(section.ctas)} />;
    case "mediaText":
      if (!isVisible(section, vis)) return null;
      return (
        <MediaText
          {...section}
          {...img(section)}
          body={typeof section.body === "string" ? section.body : undefined}
          brands={(section.brands ?? []).map(brandLogo)}
          features={(section.features ?? []).map((f) => ({ id: f.id, icon: f.icon, title: f.title, body: f.body }))}
          cta={toCta(section.cta)}
        />
      );
    case "itemList": {
      const s = section as ItemListSection;
      if (!isVisible(s, vis)) return null;
      const fa = s.featuredArticle;
      return (
        <ItemList
          id={s.id}
          layout={s.layout}
          style={s.style}
          eyebrow={s.eyebrow}
          heading={s.heading}
          headingLevel={s.headingLevel}
          body={typeof s.body === "string" ? s.body : undefined}
          items={s.items.map(listItem)}
          cta={toCta(s.cta)}
          link={s.link ? { label: s.link.label ?? "", href: resolveHref(s.link) } : null}
          featuredLabel={s.featuredLabel}
          featuredArticle={fa ? { title: fa.title, href: `/stories/${fa.slug}`, standfirst: fa.standfirst, category: fa.category, image: fa.heroImage ?? null } : null}
          disclaimer={s.disclaimer}
          settings={s.settings}
          siteLogo={ctx.siteLogo}
        />
      );
    }
    case "productGrid": {
      const limit = section.limit ?? 4;
      const tabs = (section.tabs ?? []).map((t) => ({ id: t.id, label: t.title, handle: t.shopifyHandle ?? t.value ?? "" }));
      const active = ctx.searchParams.rail ?? section.shopifyHandle ?? tabs[0]?.handle ?? ctx.defaultCollectionHandle;
      // buyAgain / related / complementary need order or product context; the proof of concept
      // falls back to the storefront's product list so the band still renders.
      const collection = section.source === "collection" && active ? await storefront.getCollection(active, { first: limit }).catch(() => null) : null;
      const products = collection ? collection.products.items : await storefront.listProducts({ first: limit }).then((r) => r.items).catch(() => []);
      const slots = section.promoTile ? Math.max(limit - 1, 1) : limit;
      return (
        <ProductRail
          id={section.id}
          heading={section.heading}
          link={section.link ? { label: section.link.label ?? "", href: resolveHref(section.link) } : null}
          tabs={tabs}
          activeHandle={active}
          products={products.slice(0, slots)}
          promoTile={promo(section.promoTile)}
          promoPosition={section.promoPosition}
          isLoggedIn={ctx.isLoggedIn}
          favouriteIds={ctx.favouriteIds}
          showPoints={ctx.showPoints}
          emptyMessage={section.source === "buyAgain" ? "Nothing to buy again yet. Your past orders will show here." : undefined}
        />
      );
    }
    case "promoTile": {
      if (!isVisible(section, vis)) return null;
      const p = promo(section);
      return p ? <Band tone="white" className="[&>div]:py-8"><div className="max-w-sm"><PromoTile {...p} /></div></Band> : null;
    }
    case "faqAccordion":
      return (
        <FaqAccordion
          id={section.id}
          eyebrow={section.eyebrow}
          heading={section.heading}
          headingLevel={section.headingLevel}
          body={typeof section.body === "string" ? section.body : undefined}
          faqs={section.faqs.filter((f: Faq) => isVisible(f, vis)).map((f) => ({ id: f.id, question: f.question, answer: f.answer, cta: toCta(f.cta), defaultOpen: f.defaultOpen }))}
          link={section.link ? { label: section.link.label ?? "", href: resolveHref(section.link) } : null}
          style={section.style}
        />
      );
    case "richTextBlock":
      return <RichTextRuled id={section.id} sideLabel={section.sideLabel} body={section.body} />;
    case "articleGrid": {
      const category = ctx.searchParams.category;
      const { items, total } = await contentful.getArticles({ category, limit: section.pageSize ?? 8 }, { preview: ctx.preview }).catch(() => ({ items: [] as Article[], total: 0 }));
      return (
        <ArticleGrid
          id={section.id}
          categories={section.categories}
          activeCategory={category}
          total={total}
          articles={items.map((a) => ({ id: a.id, title: a.title, href: `/stories/${a.slug}`, category: a.category, location: a.location, standfirst: a.standfirst, readTimeMinutes: a.readTimeMinutes, image: a.heroImage ?? null, badge: a.badge }))}
        />
      );
    }
    case "dataTable":
      return <DataTable id={section.id} heading={section.heading} columns={section.columns} rows={section.rows} footnote={section.footnote} />;
    default:
      // A section type published in Contentful that this app doesn't render yet. Skip rather than crash.
      return null;
  }
}

export function PageSections({ sections, ctx }: { sections: PageSection[]; ctx: SectionContext }) {
  return (
    <>
      {sections.map((section) => (
        <Section key={section.id} section={section} ctx={ctx} />
      ))}
    </>
  );
}
