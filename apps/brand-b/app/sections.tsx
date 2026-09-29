import type { PageSection } from "@repo/contentful";
import { Hero, ProductGridSection, RichTextSection } from "@repo/ui";
import { brand } from "../lib/brand";
import { storefront } from "../lib/shopify";

export interface SectionContext {
  isLoggedIn: boolean;
  favouriteIds: ReadonlySet<string>;
  showPoints: boolean;
  /** Fallback collection for a Product Grid with no handle set. */
  defaultCollectionHandle?: string;
}

/**
 * Maps one Contentful section to a component. This is the storefront's equivalent of a theme's
 * section registry: adding a section type means adding a case here, a fragment in
 * `@repo/contentful` queries, and the content type id to the Page.sections validation.
 */
export async function Section({ section, ctx }: { section: PageSection; ctx: SectionContext }) {
  switch (section.__typename) {
    case "Hero":
      return <Hero brand={brand} collectionHandle={ctx.defaultCollectionHandle} content={section} />;

    case "RichTextBlock":
      return <RichTextSection heading={section.heading} body={section.body?.json ?? null} />;

    case "ProductGrid": {
      const first = section.limit ?? 8;
      const handle = section.shopifyCollectionHandle || ctx.defaultCollectionHandle;
      const collection = handle ? await storefront.getCollection(handle, { first }).catch(() => null) : null;
      const products = collection
        ? collection.products.items
        : await storefront.listProducts({ first }).then((r) => r.items).catch(() => []);
      return (
        <ProductGridSection
          heading={section.heading ?? collection?.title ?? null}
          products={products}
          isLoggedIn={ctx.isLoggedIn}
          favouriteIds={ctx.favouriteIds}
          showPoints={ctx.showPoints}
        />
      );
    }

    default:
      // A section type published in Contentful that this app doesn't render yet. Skip rather than crash.
      return null;
  }
}

export function PageSections({ sections, ctx }: { sections: PageSection[]; ctx: SectionContext }) {
  return (
    <>
      {sections.map((section) => (
        <Section key={section.sys.id} section={section} ctx={ctx} />
      ))}
    </>
  );
}
