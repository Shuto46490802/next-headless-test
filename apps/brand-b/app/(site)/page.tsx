import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { contentful, contentfulEnabled } from "../../lib/contentful";
import { getSession } from "../../lib/session";
import { getFavouriteIds } from "../../lib/favorites";
import { PageSections } from "../sections";
import { getSiteLogo } from "../site-settings";

type SearchParams = Promise<Record<string, string | undefined>>;

/** Signed-in home page: the Contentful "/" Page entry with audience signedIn. */
export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { isEnabled: preview } = await draftMode();
  const sp = await searchParams;
  const page = contentfulEnabled ? await contentful.getPage("/", "signedIn", { preview }).catch(() => null) : null;
  if (!page) notFound();
  const [session, favouriteIds] = await Promise.all([getSession(), getFavouriteIds()]);
  return (
    <PageSections
      sections={page.sections}
      ctx={{ isLoggedIn: Boolean(session), favouriteIds, showPoints: false, preview, siteLogo: await getSiteLogo(preview), searchParams: sp }}
    />
  );
}
