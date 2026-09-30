import type { ReactNode } from "react";
import type { RichTextDoc } from "./primitives";

interface TextNode { nodeType: "text"; value: string; marks: { type: string }[] }
interface BlockNode { nodeType: string; data: { uri?: string } & Record<string, unknown>; content: (TextNode | BlockNode)[] }

function renderText(node: TextNode, key: number): ReactNode {
  let out: ReactNode = node.value;
  for (const mark of node.marks) {
    if (mark.type === "bold") out = <strong key={key}>{out}</strong>;
    else if (mark.type === "italic") out = <em key={key}>{out}</em>;
    else if (mark.type === "underline") out = <u key={key}>{out}</u>;
    else if (mark.type === "code") out = <code key={key} className="rounded bg-neutral-100 px-1 py-0.5 text-sm">{out}</code>;
  }
  return <span key={key}>{out}</span>;
}

function renderNodes(nodes: (TextNode | BlockNode)[]): ReactNode[] {
  return nodes.map((node, i) => {
    if (node.nodeType === "text") return renderText(node as TextNode, i);
    const block = node as BlockNode;
    const children = renderNodes(block.content ?? []);
    switch (block.nodeType) {
      case "paragraph": return <p key={i}>{children}</p>;
      case "heading-1": return <h1 key={i}>{children}</h1>;
      case "heading-2": return <h2 key={i}>{children}</h2>;
      case "heading-3": return <h3 key={i}>{children}</h3>;
      case "heading-4": return <h4 key={i}>{children}</h4>;
      case "heading-5": return <h5 key={i}>{children}</h5>;
      case "heading-6": return <h6 key={i}>{children}</h6>;
      case "unordered-list": return <ul key={i}>{children}</ul>;
      case "ordered-list": return <ol key={i}>{children}</ol>;
      case "list-item": return <li key={i}>{children}</li>;
      case "blockquote": return <blockquote key={i}>{children}</blockquote>;
      case "hr": return <hr key={i} />;
      case "table": return <table key={i}><tbody>{children}</tbody></table>;
      case "table-row": return <tr key={i}>{children}</tr>;
      case "table-header-cell": return <th key={i}>{children}</th>;
      case "table-cell": return <td key={i}>{children}</td>;
      case "hyperlink":
        return <a key={i} href={block.data.uri} className="text-brand underline" rel="noopener noreferrer">{children}</a>;
      default: return null;
    }
  });
}

/** Minimal Contentful rich text renderer for the marks and nodes the model enables. */
export function RichText({ document, className = "" }: { document: RichTextDoc; className?: string }) {
  return (
    <div className={`space-y-4 text-neutral-700 leading-relaxed [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-brand [&_h3]:font-heading [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-brand [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-brand [&_blockquote]:pl-4 [&_blockquote]:italic [&_table]:w-full [&_td]:border-b [&_td]:border-neutral-200 [&_td]:py-2 [&_th]:text-left [&_th]:font-semibold ${className}`}>
      {renderNodes(document.content as (TextNode | BlockNode)[])}
    </div>
  );
}
