import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { ArticleView } from "@repo/ui";
import { contentful, contentfulEnabled } from "../../../../lib/contentful";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const { isEnabled: preview } = await draftMode();
  const a = contentfulEnabled ? await contentful.getArticle(slug, { preview }).catch(() => null) : null;
  return a ? { title: a.title, description: a.standfirst } : {};
}

/** Community article (Contentful `article`). */
export default async function StoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const { isEnabled: preview } = await draftMode();
  const a = contentfulEnabled ? await contentful.getArticle(slug, { preview }).catch(() => null) : null;
  if (!a) notFound();
  return <ArticleView {...a} heroImage={a.heroImage ?? null} body={a.body ?? null} />;
}
