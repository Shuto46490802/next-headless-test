import type { ReactNode } from "react";

/*
 * Server-safe inspector helpers. Kept out of LivePreview.tsx, which is a "use client" module:
 * the section registries call inspectorFieldFor() during server rendering, and a function exported
 * from a client module cannot be invoked on the server.
 */

/** Marks a rendered section with the entry and field the Contentful inspector should open when it is clicked. */
export function InspectorTag({ entryId, fieldId, children }: { entryId: string; fieldId: string; children: ReactNode }) {
  return (
    <div data-contentful-entry-id={entryId} data-contentful-field-id={fieldId} data-contentful-locale="en-US">
      {children}
    </div>
  );
}

/** The field a click on a section should open in the editor. */
export function inspectorFieldFor(contentType: string): string {
  switch (contentType) {
    case "heroCarousel":
    case "itemList":
    case "articleGrid":
      return "internalName";
    case "richTextBlock":
      return "body";
    default:
      return "heading";
  }
}
