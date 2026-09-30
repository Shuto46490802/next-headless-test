import type { PageSection, Article } from "@repo/contentful";
import { isVisible } from "@repo/contentful";
import { ArticleGrid, Band, CtaBand, DataTable, EditorialHero, FaqAccordion, HeroCarousel, ItemList, MediaText, ProductRail, PromoTile, RichTextRuled } from "../cms";
import { toArticleCard, toCtaBand, toCtas, toEditorialHero, toFaqAccordion, toHeroSlides, toItemList, toMediaText, toProductRailStatic, toPromoTile } from "../cms/mappers";
import type { CmsImage } from "../cms/primitives";
import { mockProducts } from "./mocks";
import { InspectorTag, inspectorFieldFor } from "../cms/inspector";

export interface StoryCtx { isLoggedIn: boolean; siteLogo?: CmsImage | null; articles?: Article[] }

/** Storybook twin of apps/<app>/app/sections.tsx: same mappers, Shopify data mocked. */
export function renderSection(section: PageSection, ctx: StoryCtx) {
  return <InspectorTag entryId={section.id} fieldId={inspectorFieldFor(section.contentType)}>{renderInner(section, ctx)}</InspectorTag>;
}

function renderInner(section: PageSection, ctx: StoryCtx) {
  const vis = { isLoggedIn: ctx.isLoggedIn };
  switch (section.contentType) {
    case "heroCarousel": return <HeroCarousel slides={toHeroSlides(section, vis)} evergreenTiles={toCtas(section.evergreenTiles)} />;
    case "hero": return <EditorialHero {...toEditorialHero(section)} />;
    case "ctaBand": return isVisible(section, vis) ? <CtaBand {...toCtaBand(section)} /> : null;
    case "mediaText": return isVisible(section, vis) ? <MediaText {...toMediaText(section)} /> : null;
    case "itemList": return isVisible(section, vis) ? <ItemList {...toItemList(section, ctx.siteLogo)} /> : null;
    case "productGrid": {
      const rail = toProductRailStatic(section);
      const slots = rail.promoTile ? Math.max(rail.limit - 1, 1) : rail.limit;
      return <ProductRail {...rail} activeHandle={rail.shopifyHandle ?? rail.tabs[0]?.handle} products={mockProducts.slice(0, slots)} isLoggedIn={ctx.isLoggedIn} favouriteIds={new Set(["p2"])} showPoints={false} />;
    }
    case "promoTile": { const p = toPromoTile(section); return p ? <Band tone="white" className="[&>div]:py-8"><div className="max-w-sm"><PromoTile {...p} /></div></Band> : null; }
    case "faqAccordion": return <FaqAccordion {...toFaqAccordion(section, vis)} />;
    case "richTextBlock": return <RichTextRuled id={section.id} sideLabel={section.sideLabel} body={section.body} />;
    case "articleGrid": return <ArticleGrid id={section.id} categories={section.categories} articles={(ctx.articles ?? []).map(toArticleCard)} total={ctx.articles?.length} />;
    case "dataTable": return <DataTable id={section.id} heading={section.heading} columns={section.columns} rows={section.rows} footnote={section.footnote} />;
    default: return null;
  }
}
