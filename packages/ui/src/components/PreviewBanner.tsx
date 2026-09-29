/** Shown while Next.js draft mode is on: the page is rendering unpublished Contentful content. */
export function PreviewBanner({ exitHref }: { exitHref: string }) {
  return (
    <div className="flex items-center justify-center gap-4 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950">
      <span>Preview mode: showing draft content from Contentful.</span>
      <a href={exitHref} className="underline">
        Exit preview
      </a>
    </div>
  );
}
