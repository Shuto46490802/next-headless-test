import type { Metadata } from "next";
import Image from "next/image";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { Band, Eyebrow, Heading, RichText } from "@repo/ui";
import { contentful, contentfulEnabled } from "../../../lib/contentful";

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
  return (
    <article>
      <Band tone="tint">
        <div className="flex max-w-3xl flex-col gap-4">
          <Eyebrow className="text-brand">{[a.category, a.location].filter(Boolean).join(" · ")}</Eyebrow>
          <Heading level="h1" size="xl" className="text-brand">{a.title}</Heading>
          {a.standfirst ? <p className="text-lg text-neutral-600">{a.standfirst}</p> : null}
          {a.readTimeMinutes ? <p className="text-sm text-neutral-500">{a.readTimeMinutes} min read</p> : null}
        </div>
      </Band>
      {a.heroImage ? (
        <div className="mx-auto max-w-[1360px] px-4 sm:px-8"><div className="relative -mt-8 aspect-[21/9] overflow-hidden rounded-3xl"><Image src={a.heroImage.url} alt="" fill sizes="1360px" className="object-cover" priority /></div></div>
      ) : null}
      {a.body ? <Band tone="white"><RichText document={a.body} className="mx-auto max-w-3xl text-lg" /></Band> : null}
    </article>
  );
}
