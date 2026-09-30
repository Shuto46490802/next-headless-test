import { notFound } from "next/navigation";
import { ArticleView, LivePreviewBridge, SiteFooter, SiteHeader } from "@repo/ui";
import { brand } from "../../../lib/brand";
import { storefront } from "../../../lib/shopify";
import { contentful, contentfulEnabled } from "../../../lib/contentful";
import { removeCartLineAction, updateCartLineAction } from "../../cart-actions";
import { PageSections, toCta, toFooter, toLoggedOutNav, toNavigation } from "../../sections";
import { getSiteSettings } from "../../site-settings";

export const dynamic = "force-dynamic";

/**
 * Contentful Live Preview target (Settings > Content preview). Loaded inside the entry editor's
 * preview pane, so it cannot rely on a storefront login or a draft-mode cookie: a shared secret in
 * the URL gates it, every read goes to the Preview API (drafts included), and LivePreviewBridge
 * re-renders on each editor change. Never links to real sessions or carts.
 *
 *   /preview?secret=…&slug=/&audience=signedIn        a page (slug "/" is the home / landing)
 *   /preview?secret=…&type=article&slug=story-1       an article
 */
export default async function PreviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const secret = process.env.CONTENTFUL_PREVIEW_SECRET;
  if (!contentfulEnabled || !secret || sp.secret !== secret) notFound();

  const audience = sp.audience === "loggedOut" ? "loggedOut" : "signedIn";
  const isLoggedIn = audience === "signedIn";
  const slug = sp.slug && sp.slug !== "" ? sp.slug : "/";
  const [settings, collections] = await Promise.all([getSiteSettings(true), storefront.listCollections(1).catch(() => [])]);

  let body: React.ReactNode;
  if (sp.type === "article") {
    const a = await contentful.getArticle(slug, { preview: true }).catch(() => null);
    body = a ? <ArticleView {...a} heroImage={a.heroImage ?? null} body={a.body ?? null} /> : <Missing what={`article "${slug}"`} />;
  } else {
    const page = await contentful.getPage(slug, audience, { preview: true }).catch(() => null);
    body = page ? (
      <PageSections
        sections={page.sections}
        ctx={{ isLoggedIn, favouriteIds: new Set(), showPoints: false, preview: true, siteLogo: settings?.logo ?? null, searchParams: sp, defaultCollectionHandle: collections[0]?.handle }}
      />
    ) : (
      <Missing what={`page "${slug}" for audience ${audience}`} />
    );
  }

  return (
    <>
      <LivePreviewBridge />
      <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-amber-950">Contentful preview · draft content · {audience === "signedIn" ? "signed-in view" : "logged-out view"}</div>
      <SiteHeader
        brand={brand}
        logo={settings?.logo ?? null}
        isLoggedIn={isLoggedIn}
        announcementMessages={settings?.announcementMessages}
        navigation={toNavigation(settings?.headerNavigation)}
        loggedOutNavigation={toLoggedOutNav(settings)}
        loggedOutCtas={(settings?.loggedOutCtas ?? []).map(toCta).filter((c) => c !== null)}
        searchPlaceholder={settings?.searchPlaceholder}
        balance={isLoggedIn ? { label: "Credit", value: "$1,284.00" } : null}
        cart={null}
        cartActions={{ updateQuantity: updateCartLineAction, remove: removeCartLineAction }}
        collections={collections.map((c) => ({ handle: c.handle, title: c.title }))}
      />
      <main className="flex-1">{body}</main>
      <SiteFooter brand={brand} logo={settings?.logo ?? null} {...(toFooter(settings) ?? {})} />
    </>
  );
}

function Missing({ what }: { what: string }) {
  return <p className="p-10 text-center text-neutral-500">No published or draft {what} for this site yet.</p>;
}
