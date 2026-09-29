import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "../../../lib/session";

/**
 * Contentful "Open preview" target (Settings > Content preview). Turns on Next.js draft mode so
 * pages read unpublished content through the Preview API, then redirects to the page.
 * The storefront is members-only, so a logged-in session stands in for a preview secret.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get("slug") ?? "home").replace(/[^a-z0-9-]/g, "");
  const target = slug === "home" || slug === "" ? "/" : `/${slug}`;

  const session = await getSession();
  if (!session) {
    redirect(`/gate?returnTo=${encodeURIComponent(url.pathname + url.search)}`);
  }

  (await draftMode()).enable();
  redirect(target);
}
