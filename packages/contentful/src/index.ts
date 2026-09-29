import { createContentfulClient, type ContentfulConfig, type RequestOptions } from "./client";
import { BRAND_QUERY, PAGE_QUERY, SITE_SETTINGS_QUERY } from "./queries";
import type {
  Brand,
  ContentfulImage,
  NavLink,
  NavigationColumn,
  NavigationItem,
  Page,
  PageSection,
  SiteSettings,
} from "./types";

export * from "./types";
export { ContentfulApiError, type ContentfulConfig, type RequestOptions } from "./client";

interface RawPage extends Omit<Page, "sections"> {
  sectionsCollection: { items: (PageSection | null)[] };
}

type Items<T> = { items: (T | null)[] };
interface RawNavColumn {
  heading: string;
  linksCollection: Items<NavLink>;
}
interface RawNavItem {
  label: string;
  url: string | null;
  promoHeading: string | null;
  promoUrl: string | null;
  promoImage: ContentfulImage | null;
  columnsCollection: Items<RawNavColumn>;
}
interface RawSiteSettings {
  announcementBar: string | null;
  footerText: string | null;
  headerNavigationCollection: Items<RawNavItem>;
  footerColumnsCollection: Items<RawNavColumn>;
  socialLinksCollection: Items<NavLink>;
}

/** Unpublished references come back as null from the Delivery API; drop them. */
function present<T>(items: (T | null)[]): T[] {
  return items.filter((i): i is T => i !== null);
}

function mapColumn(raw: RawNavColumn): NavigationColumn {
  return { heading: raw.heading, links: present(raw.linksCollection.items) };
}

function mapNavItem(raw: RawNavItem): NavigationItem {
  const hasPromo = Boolean(raw.promoHeading || raw.promoImage);
  return {
    label: raw.label,
    url: raw.url,
    columns: present(raw.columnsCollection.items).map(mapColumn),
    promo: hasPromo ? { heading: raw.promoHeading, url: raw.promoUrl, image: raw.promoImage } : null,
  };
}

export function createContentful(config: ContentfulConfig) {
  const client = createContentfulClient(config);
  const brand = config.brandSlug;

  return {
    client,

    /**
     * A page by slug, scoped to this brand. `"home"` is the homepage. Null when the brand has
     * no such page, so callers can fall back to a static layout. Unpublished sections come back
     * as null from the Delivery API and are dropped.
     */
    async getPage(slug: string, opts?: RequestOptions): Promise<Page | null> {
      const data = await client.request<{ pageCollection: { items: (RawPage | null)[] } }>(
        PAGE_QUERY,
        { brand, slug },
        opts,
      );
      const raw = data.pageCollection.items[0];
      if (!raw) return null;
      const { sectionsCollection, ...rest } = raw;
      return {
        ...rest,
        sections: sectionsCollection.items.filter((s): s is PageSection => s !== null),
      };
    },

    /**
     * Announcement bar, header navigation and footer for this brand. Null when no Site Settings
     * entry exists, so the layout can fall back to the collection-based nav.
     */
    async getSiteSettings(opts?: RequestOptions): Promise<SiteSettings | null> {
      const data = await client.request<{ siteSettingsCollection: Items<RawSiteSettings> }>(
        SITE_SETTINGS_QUERY,
        { brand },
        opts,
      );
      const raw = data.siteSettingsCollection.items[0];
      if (!raw) return null;
      return {
        announcementBar: raw.announcementBar,
        footerText: raw.footerText,
        headerNavigation: present(raw.headerNavigationCollection.items).map(mapNavItem),
        footerColumns: present(raw.footerColumnsCollection.items).map(mapColumn),
        socialLinks: present(raw.socialLinksCollection.items),
      };
    },

    async getBrand(opts?: RequestOptions): Promise<Brand | null> {
      const data = await client.request<{ brandCollection: { items: (Brand | null)[] } }>(
        BRAND_QUERY,
        { brand },
        opts,
      );
      return data.brandCollection.items[0] ?? null;
    },
  };
}

export type Contentful = ReturnType<typeof createContentful>;
