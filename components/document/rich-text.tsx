import { Fragment, type ReactNode } from "react";
import { hrefFor } from "@/lib/documents/format";
import type { RichText, RichTextNode } from "@/lib/documents/schema";

function renderMarks(text: string, node: RichTextNode, key: string): ReactNode {
  let out: ReactNode = text;
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        out = <strong>{out}</strong>;
        break;
      case "italic":
        out = <em>{out}</em>;
        break;
      case "underline":
        out = <u>{out}</u>;
        break;
      case "link": {
        const href = typeof mark.attrs?.href === "string" ? hrefFor(mark.attrs.href) : undefined;
        // Only allow safe protocols in rendered documents.
        out = href && /^(https?:|mailto:|tel:)/i.test(href) ? <a href={href}>{out}</a> : out;
        break;
      }
    }
  }
  return <Fragment key={key}>{out}</Fragment>;
}

function renderInline(nodes: RichTextNode[] | undefined, keyPrefix: string): ReactNode[] {
  return (nodes ?? []).map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    if (node.type === "text") return renderMarks(node.text ?? "", node, key);
    if (node.type === "hardBreak") return <br key={key} />;
    return null;
  });
}

function renderBlock(node: RichTextNode, key: string): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{renderInline(node.content, key)}</p>;
    case "bulletList":
      return <ul key={key}>{(node.content ?? []).map((item, i) => renderBlock(item, `${key}-${i}`))}</ul>;
    case "orderedList":
      return (
        <ol key={key} start={typeof node.attrs?.start === "number" ? node.attrs.start : undefined}>
          {(node.content ?? []).map((item, i) => renderBlock(item, `${key}-${i}`))}
        </ol>
      );
    case "listItem":
      return <li key={key}>{(node.content ?? []).map((child, i) => renderBlock(child, `${key}-${i}`))}</li>;
    default:
      return null;
  }
}

function hasText(node: RichTextNode): boolean {
  if (node.type === "text") return Boolean(node.text?.trim());
  return (node.content ?? []).some(hasText);
}

export function isRichTextEmpty(doc: RichText | null | undefined): boolean {
  return !doc || !hasText(doc);
}

export type RichTextChunk = {
  key: string;
  /** "list-item" chunks that follow another item of the same list sit tighter together. */
  kind: "paragraph" | "list-item";
  continuesList: boolean;
  node: ReactNode;
};

/**
 * Splits a rich-text document into page-breakable chunks: one per paragraph and one per list item.
 * Each chunk renders standalone (list items keep their list wrapper and numbering).
 */
export function richTextChunks(doc: RichText | null | undefined, keyPrefix: string): RichTextChunk[] {
  if (!doc) return [];
  const chunks: RichTextChunk[] = [];
  (doc.content ?? []).forEach((node, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!hasText(node)) return;
    if (node.type === "bulletList" || node.type === "orderedList") {
      const start = typeof node.attrs?.start === "number" ? node.attrs.start : 1;
      (node.content ?? []).forEach((item, j) => {
        const itemKey = `${key}-${j}`;
        const li = renderBlock(item, itemKey);
        chunks.push({
          key: itemKey,
          kind: "list-item",
          continuesList: j > 0,
          node:
            node.type === "bulletList" ? (
              <ul className="doc-rt">{li}</ul>
            ) : (
              <ol className="doc-rt" start={start + j}>
                {li}
              </ol>
            ),
        });
      });
    } else {
      chunks.push({
        key,
        kind: "paragraph",
        continuesList: false,
        node: <div className="doc-rt">{renderBlock(node, key)}</div>,
      });
    }
  });
  return chunks;
}
