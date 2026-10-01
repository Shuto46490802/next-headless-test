import type { Article, PageSection } from "@repo/contentful";
import { isVisible } from "@repo/contentful";
import {
  ArticleGrid, Band, CtaBand, DataTable, EditorialHero, FaqAccordion, HeroCarousel, ItemList, MediaText, ProductRail, PromoTile, RichTextRuled,
  toArticleCard, toCta, toCtaBand, toCtas, toEditorialHero, toFaqAccordion, toFooter, toHeroSlides, toItemList, toLoggedOutNav, toMediaText, toNavigation, toProductRailStatic, toPromoTile,
  type CmsImage,
  InspectorTag,
  inspectorFieldFor,
} from "@repo/ui";
export { toCta, toFooter, toLoggedOutNav, toNavigation };
import { contentful } from "../lib/contentful";
import { storefront } from "../lib/shopify";
import { getBuyer } from "../lib/listing";
import { getDeliveryState } from "../lib/location";
import { availableInState } from "@repo/shopify-storefront";

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

/**
 * The storefront's section registry: one case per Contentful section type, like a theme's
 * sections folder. Adding a section = a content type in Contentful, a type in @repo/contentful,
 * a component in @repo/ui and a case here.
 */
export async function Section({ section, ctx }: { section: PageSection; ctx: SectionContext }) {
  const vis = { isLoggedIn: ctx.isLoggedIn };
  switch (section.contentType) {
    case "heroCarousel":
      return <HeroCarousel slides={toHeroSlides(section, vis)} evergreenTiles={toCtas(section.evergreenTiles)} />;
    case "hero":
      return <EditorialHero {...toEditorialHero(section)} />;
    case "ctaBand":
      if (!isVisible(section, vis)) return null;
      return <CtaBand {...toCtaBand(section)} />;
    case "mediaText":
      if (!isVisible(section, vis)) return null;
      return <MediaText {...toMediaText(section)} />;
    case "itemList":
      if (!isVisible(section, vis)) return null;
      return <ItemList {...toItemList(section, ctx.siteLogo)} />;
    case "productGrid": {
      const rail = toProductRailStatic(section);
      const active = ctx.searchParams.rail ?? rail.shopifyHandle ?? rail.tabs[0]?.handle ?? ctx.defaultCollectionHandle;
      // buyAgain / related / complementary need order or product context; the proof of concept
      // falls back to the storefront's product list so the band still renders.
      const buyer = await getBuyer();
      const collection = rail.source === "collection" && active ? await storefront.getCollection(active, { first: rail.limit, buyer }).catch(() => null) : null;
      const state = await getDeliveryState();
      const products = (collection ? collection.products.items : await storefront.listProducts({ first: rail.limit, buyer }).then((r) => r.items).catch(() => [])).filter((p) => availableInState(p, state));
      const slots = rail.promoTile ? Math.max(rail.limit - 1, 1) : rail.limit;
      return (
        <ProductRail
          {...rail}
          activeHandle={active}
          products={products.slice(0, slots)}
          isLoggedIn={ctx.isLoggedIn}
          favouriteIds={ctx.favouriteIds}
          showPoints={ctx.showPoints}
          emptyMessage={rail.source === "buyAgain" ? "Nothing to buy again yet. Your past orders will show here." : undefined}
        />
      );
    }
    case "promoTile": {
      if (!isVisible(section, vis)) return null;
      const p = toPromoTile(section);
      return p ? <Band tone="white" className="[&>div]:py-8"><div className="max-w-sm"><PromoTile {...p} /></div></Band> : null;
    }
    case "faqAccordion":
      return <FaqAccordion {...toFaqAccordion(section, vis)} />;
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
          articles={items.map(toArticleCard)}
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
        <InspectorTag key={section.id} entryId={section.id} fieldId={inspectorFieldFor(section.contentType)}>
          <Section section={section} ctx={ctx} />
        </InspectorTag>
      ))}
    </>
  );
}
