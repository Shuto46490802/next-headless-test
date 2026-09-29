import { RichText, type RichTextDocument } from "./RichText";

export interface RichTextSectionProps {
  heading?: string | null;
  body?: RichTextDocument | null;
}

/** Page section: an optional heading plus formatted copy. */
export function RichTextSection({ heading, body }: RichTextSectionProps) {
  if (!heading && !body) return null;
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      {heading ? <h2 className="mb-6 text-2xl font-semibold text-neutral-900">{heading}</h2> : null}
      {body ? <RichText document={body} /> : null}
    </section>
  );
}
