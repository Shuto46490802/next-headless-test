import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@repo/ui";
import { brand } from "../../lib/brand";
import { getSession } from "../../lib/session";
import { safeReturnTo } from "../../lib/safe-return-to";
import { contentful, contentfulEnabled } from "../../lib/contentful";
import { PageSections } from "../sections";
import { getSiteLogo } from "../site-settings";

/**
 * The logged-out landing page. Middleware sends every unauthenticated request here, so this is
 * where the Contentful "/" Page with audience loggedOut renders (Figma "Logged-out landing").
 */
export default async function GatePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const returnTo = safeReturnTo(sp.returnTo, "/");
  const session = await getSession();
  if (session) redirect(returnTo);

  const { isEnabled: preview } = await draftMode();
  const page = contentfulEnabled ? await contentful.getPage("/", "loggedOut", { preview }).catch(() => null) : null;
  if (page) {
    return (
      <PageSections
        sections={page.sections}
        ctx={{ isLoggedIn: false, favouriteIds: new Set(), showPoints: false, preview, siteLogo: await getSiteLogo(preview), searchParams: sp }}
      />
    );
  }

  const loginHref = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="font-heading text-4xl font-bold text-brand">{brand.name}</h1>
      <p className="text-neutral-600">This store is available to registered customers only. Sign in to continue.</p>
      <a href={loginHref}><Button>Sign in</Button></a>
    </section>
  );
}
