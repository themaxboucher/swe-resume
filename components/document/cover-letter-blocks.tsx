import { formatLongDate } from "@/lib/documents/format";
import type { CoverLetterContent, DocumentDesign } from "@/lib/documents/schema";
import { DocumentHeader } from "./document-header";
import { richTextChunks } from "./rich-text";
import type { Block, DocumentBlocks } from "./types";

export function buildCoverLetterBlocks(content: CoverLetterContent, design: DocumentDesign): DocumentBlocks {
  const paragraphGap = Math.round(design.fontSize * 0.9);
  const main: Block[] = [];
  const { recipient } = content;

  const recipientLines = [
    recipient.name,
    recipient.title,
    recipient.company,
    ...recipient.address.split("\n"),
  ].filter((line) => line.trim());
  const date = formatLongDate(content.date);

  if (date || recipientLines.length > 0) {
    main.push({
      key: "meta",
      gap: design.sectionSpacing,
      node: (
        <div className="doc-letter-meta">
          {date && <p className="doc-letter-date">{date}</p>}
          {recipientLines.length > 0 && (
            <address className="doc-letter-recipient">
              {recipientLines.map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </address>
          )}
        </div>
      ),
    });
  }

  if (content.subject) {
    main.push({
      key: "subject",
      gap: design.sectionSpacing,
      node: <p className="doc-letter-subject">{content.subject}</p>,
    });
  }

  if (content.greeting) {
    main.push({ key: "greeting", gap: paragraphGap, node: <p>{content.greeting}</p> });
  }

  for (const chunk of richTextChunks(content.body, "body")) {
    main.push({ key: chunk.key, gap: chunk.continuesList ? 2 : paragraphGap, node: chunk.node });
  }

  if (content.closing || content.signature) {
    main.push({
      key: "closing",
      gap: paragraphGap * 1.5,
      node: (
        <div className="doc-letter-closing">
          {content.closing && <p>{content.closing}</p>}
          {content.signature && <p className="doc-letter-signature">{content.signature}</p>}
        </div>
      ),
    });
  }

  return { header: <DocumentHeader personal={content.sender} design={design} />, main, sidebar: [] };
}
