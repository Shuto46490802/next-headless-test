import type { ReactNode } from "react";

/**
 * Minimal renderer for Contentful rich text JSON. Covers the node types the Rich Text Block
 * content type enables (paragraphs, headings, lists, quotes, rules, links, inline marks).
 * Structural types are declared here so the UI package does not depend on the CMS package.
 */
export interface RichTextTextNode {
  nodeType: "text";
  value: string;
  marks: { type: string }[];
}
export interface RichTextBlockNode {
  nodeType: string;
  data: { uri?: string } & Record<string, unknown>;
  content: RichTextNode[];
}
export type RichTextNode = RichTextTextNode | RichTextBlockNode;
export interface RichTextDocument {
  nodeType: "document";
  content: RichTextNode[];
}

function renderText(node: RichTextTextNode, key: number): ReactNode {
  let out: ReactNode = node.value;
  for (const mark of node.marks) {
    if (mark.type === "bold") out = <strong key={key}>{out}</strong>;
    else if (mark.type === "italic") out = <em key={key}>{out}</em>;
    else if (mark.type === "underline") out = <u key={key}>{out}</u>;
    else if (mark.type === "code") out = <code key={key} className="rounded bg-neutral-100 px-1 py-0.5 text-sm">{out}</code>;
  }
  return <span key={key}>{out}</span>;
}

function renderNodes(nodes: RichTextNode[]): ReactNode[] {
  return nodes.map((node, i) => {
    if (node.nodeType === "text") return renderText(node as RichTextTextNode, i);
    const block = node as RichTextBlockNode;
    const children = renderNodes(block.content ?? []);
    switch (block.nodeType) {
      case "paragraph":
        return <p key={i}>{children}</p>;
      case "heading-1":
        return <h1 key={i}>{children}</h1>;
      case "heading-2":
        return <h2 key={i}>{children}</h2>;
      case "heading-3":
        return <h3 key={i}>{children}</h3>;
      case "heading-4":
        return <h4 key={i}>{children}</h4>;
      case "heading-5":
        return <h5 key={i}>{children}</h5>;
      case "heading-6":
        return <h6 key={i}>{children}</h6>;
      case "unordered-list":
        return <ul key={i}>{children}</ul>;
      case "ordered-list":
        return <ol key={i}>{children}</ol>;
      case "list-item":
        return <li key={i}>{children}</li>;
      case "blockquote":
        return <blockquote key={i}>{children}</blockquote>;
      case "hr":
        return <hr key={i} />;
      case "hyperlink":
        return (
          <a key={i} href={block.data.uri} className="underline" rel="noopener noreferrer">
            {children}
          </a>
        );
      default:
        // Embedded entries/assets and anything else this renderer doesn't know: skip silently.
        return null;
    }
  });
}

export function RichText({ document, className = "" }: { document: RichTextDocument; className?: string }) {
  return <div className={`prose-like space-y-4 text-neutral-700 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-neutral-900 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-4 [&_blockquote]:italic ${className}`}>{renderNodes(document.content)}</div>;
}
