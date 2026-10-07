import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { contentful, contentfulEnabled } from "../../lib/contentful";
import { getSession } from "../../lib/session";
import { getFavouriteIds } from "../../lib/favorites";
import { getPointsContext } from "../../lib/points";
import { PageSections } from "../sections";
import { getSiteLogo } from "../site-settings";

type SearchParams = Promise<Record<string, string | undefined>>;

/** Signed-in home page: the Contentful "/" Page entry with audience signedIn. */
export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { isEnabled: preview } = await draftMode();
  const sp = await searchParams;
  const page = contentfulEnabled ? await contentful.getPage("/", "signedIn", { preview }).catch(() => null) : null;
  if (!page) notFound();
  const [session, favouriteIds, points] = await Promise.all([getSession(), getFavouriteIds(), getPointsContext()]);
  return (
    <PageSections
      sections={page.sections}
      ctx={{ isLoggedIn: Boolean(session), favouriteIds, showPoints: points.enabled, preview, siteLogo: await getSiteLogo(preview), searchParams: sp }}
    />
  );
}
