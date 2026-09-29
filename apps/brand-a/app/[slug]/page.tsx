import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { storefront } from "../../lib/shopify";
import { contentful, contentfulEnabled } from "../../lib/contentful";
import { getSession } from "../../lib/session";
import { getFavouriteIds } from "../../lib/favorites";
import { PageSections } from "../sections";

type Params = Promise<{ slug: string }>;

/**
 * Any Contentful Page for this brand other than "home", e.g. /about. Static routes such as
 * /products and /collections take precedence over this catch-all.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const { isEnabled: preview } = await draftMode();
  const page = contentfulEnabled ? await contentful.getPage(slug, { preview }).catch(() => null) : null;
  return page ? { title: page.title, description: page.seoDescription ?? undefined } : {};
}

export default async function ContentPage({ params }: { params: Params }) {
  const { slug } = await params;
  if (slug === "home") notFound();
  const { isEnabled: preview } = await draftMode();
  const page = contentfulEnabled ? await contentful.getPage(slug, { preview }).catch(() => null) : null;
  if (!page) notFound();

  const [session, favouriteIds, collections] = await Promise.all([
    getSession(),
    getFavouriteIds(),
    storefront.listCollections(1).catch(() => []),
  ]);

  return (
    <PageSections
      sections={page.sections}
      ctx={{
        isLoggedIn: Boolean(session),
        favouriteIds,
        showPoints: false,
        defaultCollectionHandle: collections[0]?.handle,
      }}
    />
  );
}
