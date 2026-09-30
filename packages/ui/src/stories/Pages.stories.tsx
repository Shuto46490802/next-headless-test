import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Article, Page, SiteSettings } from "@repo/contentful";
import { renderSection } from "./renderSection";
import { audienceOf, cms, siteOf } from "./contentful";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { toCta, toFooter, toLoggedOutNav, toNavigation } from "../cms/mappers";
import { noopCart } from "./mocks";

/**
 * Whole pages as configured in Contentful for the selected site: header, every section in the
 * Page entry's order, footer. "/" follows the Audience toolbar (logged-out landing vs signed-in home).
 */
const meta = { title: "CMS/Pages", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;

type Loaded = { page: Page | null; settings: SiteSettings | null; articles: Article[]; source: string };

function FullPage({ loaded, isLoggedIn, site }: { loaded: Loaded; isLoggedIn: boolean; site: string }) {
  const s = loaded.settings;
  const brand = { slug: site.toLowerCase(), name: s?.seoTitle ?? site, tagline: s?.seoDescription ?? "" };
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        brand={brand}
        logo={s?.logo ?? null}
        isLoggedIn={isLoggedIn}
        announcementMessages={s?.announcementMessages}
        navigation={toNavigation(s?.headerNavigation)}
        loggedOutNavigation={toLoggedOutNav(s)}
        loggedOutCtas={(s?.loggedOutCtas ?? []).map(toCta).filter((c) => c !== null)}
        searchPlaceholder={s?.searchPlaceholder}
        balance={isLoggedIn && site !== "DC" ? { label: site === "CC" ? "Club Credit" : "Credit", value: "$1,284.00" } : null}
        cart={null}
        cartActions={noopCart}
      />
      <main className="flex-1">
        {loaded.page ? (
          loaded.page.sections.map((sec) => <div key={sec.id}>{renderSection(sec, { isLoggedIn, siteLogo: s?.logo ?? null, articles: loaded.articles })}</div>)
        ) : (
          <p className="p-8 text-sm text-neutral-500">No page for this site and audience. Source: {loaded.source}</p>
        )}
      </main>
      <SiteFooter brand={brand} logo={s?.logo ?? null} {...(toFooter(s) ?? {})} />
    </div>
  );
}

function pageStory(slug: string, audienceFromToolbar = false): StoryObj {
  return {
    loaders: [
      async ({ globals }) => {
        const site = siteOf(globals);
        const { client, source } = cms(site);
        const audience = audienceFromToolbar ? audienceOf(globals) : "all";
        const [page, settings, articles] = await Promise.all([client.getPage(slug, audience).catch(() => null), client.getSiteSettings().catch(() => null), client.getArticles({ limit: 8 }).then((r) => r.items).catch(() => [])]);
        return { page, settings, articles, source } satisfies Loaded;
      },
    ],
    render: (_args, { loaded, globals }) => <FullPage loaded={loaded as Loaded} isLoggedIn={audienceOf(globals) === "signedIn"} site={siteOf(globals)} />,
  };
}

export const Home = pageStory("/", true);
export const OurStory = pageStory("our-story");
export const HelpCentre = pageStory("faqs");
export const Brands = pageStory("brands");
export const Community_CC = pageStory("community");
export const LiquorLicences_CC_PC = pageStory("liquor-licences");
export const ShippingDelivery_DC = pageStory("shipping-delivery");
