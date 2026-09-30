import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { storefront } from "../../../lib/shopify";
import { contentful, contentfulEnabled } from "../../../lib/contentful";
import { getSession } from "../../../lib/session";
import { getFavouriteIds } from "../../../lib/favorites";
import { PageSections } from "../../sections";
import { getSiteLogo } from "../../site-settings";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | undefined>>;

/** Any Contentful Page for this site other than "/", e.g. /our-story. Static routes win over this catch-all. */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const { isEnabled: preview } = await draftMode();
  const page = contentfulEnabled ? await contentful.getPage(slug, "all", { preview }).catch(() => null) : null;
  return page ? { title: page.seoTitle ?? page.title, description: page.seoDescription, robots: page.noIndex ? { index: false } : undefined } : {};
}

export default async function ContentPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { isEnabled: preview } = await draftMode();
  const session = await getSession();
  const page = contentfulEnabled ? await contentful.getPage(slug, session ? "signedIn" : "loggedOut", { preview }).catch(() => null) : null;
  if (!page) notFound();
  const [, favouriteIds, collections] = await Promise.all([getSession(), getFavouriteIds(), storefront.listCollections(1).catch(() => [])]);

  return (
    <PageSections
      sections={page.sections}
      ctx={{ isLoggedIn: Boolean(session), favouriteIds, showPoints: false, preview, siteLogo: await getSiteLogo(preview), searchParams: sp, defaultCollectionHandle: collections[0]?.handle }}
    />
  );
}
