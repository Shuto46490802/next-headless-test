import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { PageSection, ItemListSection, MediaTextSection } from "@repo/contentful";
import { renderSection } from "./renderSection";
import { sectionsOfType, siteOf, audienceOf, cms } from "./contentful";

/**
 * Every configured instance of a section type for the selected site, rendered exactly as the
 * storefront renders it (same mappers, Shopify products mocked). Switch site and audience in the
 * toolbar. Content comes from Contentful when STORYBOOK_CONTENTFUL_* env vars are set, otherwise
 * from the exported fixture.
 */
const meta = {
  title: "CMS/Sections",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

type Loaded = { items: PageSection[]; source: string; siteLogo?: { url: string } | null };

function Catalogue({ loaded, isLoggedIn }: { loaded: Loaded; isLoggedIn: boolean }) {
  if (loaded.items.length === 0) return <p className="p-8 text-sm text-neutral-500">No entries of this type for this site. Source: {loaded.source}</p>;
  return (
    <div className="flex flex-col gap-10">
      {loaded.items.map((s) => (
        <div key={s.id}>
          <div className="flex items-center gap-3 bg-neutral-900 px-4 py-1.5 font-mono text-[11px] text-white">
            <span className="rounded bg-white/15 px-1.5 py-0.5">{s.contentType}</span>
            <span>{("internalName" in s && s.internalName) || ("heading" in s && s.heading) || s.id}</span>
            <span className="ml-auto text-white/60">{s.id} · {loaded.source}</span>
          </div>
          {renderSection(s, { isLoggedIn, siteLogo: loaded.siteLogo ?? null })}
        </div>
      ))}
    </div>
  );
}

function story(contentType: PageSection["contentType"], where: Record<string, string> = {}): StoryObj {
  return {
    loaders: [
      async ({ globals }) => {
        const site = siteOf(globals);
        const [{ items, source }, settings] = await Promise.all([sectionsOfType(site, contentType, where), cms(site).client.getSiteSettings().catch(() => null)]);
        return { items, source, siteLogo: settings?.logo ?? null } satisfies Loaded;
      },
    ],
    render: (_args, { loaded, globals }) => <Catalogue loaded={loaded as Loaded} isLoggedIn={audienceOf(globals) === "signedIn"} />,
  };
}

export const HeroCarousel = story("heroCarousel");
export const EditorialHero = story("hero");
export const CtaBand = story("ctaBand");
export const MediaText_VideoAndExplainers: StoryObj = story("mediaText", { variant: "mediaText" } satisfies Partial<Record<keyof MediaTextSection, string>>);
export const MediaText_LogoGroup = story("mediaText", { variant: "logoGroupText" });
export const MediaText_ReferralHero = story("mediaText", { variant: "referralHero" });
const layouts: ItemListSection["layout"][] = ["numberedSteps", "arrowList", "iconFeatureRow", "featureColumns", "categoryTiles", "timeline", "statsFeature", "shortcutTiles", "logoStrip", "brandDirectory", "jurisdictionList", "testimonialCarousel"];
export const List_NumberedSteps = story("itemList", { layout: layouts[0] });
export const List_ArrowList = story("itemList", { layout: layouts[1] });
export const List_IconFeatureRow = story("itemList", { layout: layouts[2] });
export const List_FeatureColumns = story("itemList", { layout: layouts[3] });
export const List_CategoryTiles = story("itemList", { layout: layouts[4] });
export const List_Timeline = story("itemList", { layout: layouts[5] });
export const List_StatsFeature = story("itemList", { layout: layouts[6] });
export const List_ShortcutTiles = story("itemList", { layout: layouts[7] });
export const List_LogoStrip = story("itemList", { layout: layouts[8] });
export const List_BrandDirectory = story("itemList", { layout: layouts[9] });
export const List_JurisdictionList = story("itemList", { layout: layouts[10] });
export const List_TestimonialCarousel = story("itemList", { layout: layouts[11] });
export const ProductRail = story("productGrid");
export const PromoTile = story("promoTile");
export const FaqAccordion = story("faqAccordion");
export const RichTextRuled = story("richTextBlock");
export const ArticleGrid = story("articleGrid");
export const DataTable = story("dataTable");
