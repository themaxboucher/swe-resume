import type { ReactNode } from "react";
import { displayUrl, formatDateRange, hrefFor } from "@/lib/documents/format";
import type { DocumentDesign, Entry, ListSection, ResumeContent } from "@/lib/documents/schema";
import { SECTION_CONFIG, defaultColumnFor } from "@/lib/documents/sections";
import { cn } from "@/lib/utils";
import { DocumentHeader } from "./document-header";
import { isRichTextEmpty, richTextChunks, type RichTextChunk } from "./rich-text";
import type { Block, DocumentBlocks } from "./types";

const LIST_ITEM_GAP = 2;

function chunkGap(chunk: RichTextChunk, design: DocumentDesign) {
  return chunk.continuesList ? LIST_ITEM_GAP : Math.round(design.fontSize * 0.5);
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="doc-section-title">{children}</h2>;
}

function EntryHeading({ entry, section, design }: { entry: Entry; section: ListSection; design: DocumentDesign }) {
  const config = SECTION_CONFIG[section.type];
  if (config.compact) {
    const detail = section.type === "links" ? displayUrl(entry.url) : entry.level;
    const title =
      section.type === "links" && entry.url ? <a href={hrefFor(entry.url)}>{entry.title || detail}</a> : entry.title;
    return (
      <div className="doc-compact">
        {title && <span className="doc-compact-title">{title}</span>}
        {detail && (section.type !== "links" || entry.title) && <span className="doc-compact-detail">{detail}</span>}
      </div>
    );
  }

  const dates = config.fields.includes("dates")
    ? formatDateRange(entry.startDate, entry.endDate, entry.current, design.dateFormat, entry.currentLabel)
    : "";
  const isEducation = section.type === "education";
  const style = isEducation ? design.schoolStyle : design.employerStyle;
  const subtitleUrl = isEducation ? "" : entry.subtitleUrl;
  const inline = style.placement !== "below";
  const title = entry.title && <span className="doc-entry-title">{entry.title}</span>;
  const subtitle = entry.subtitle && (
    <span
      className={cn(
        "doc-entry-subtitle",
        style.italic && "doc-entry-subtitle--italic",
        !isEducation && style.underlineLinks && "doc-entry-subtitle--underline",
      )}
    >
      {subtitleUrl ? <a href={hrefFor(subtitleUrl)}>{entry.subtitle}</a> : entry.subtitle}
    </span>
  );
  const [first, second] = style.order === "subtitle-first" ? [subtitle, title] : [title, subtitle];
  // Below layout: the second item moves up when the first is empty.
  const lead = inline ? first : first || second;
  const trailing = inline || !first ? null : second;

  const meta = [
    trailing,
    entry.location,
    entry.url && (
      <a key="url" href={hrefFor(entry.url)}>
        {displayUrl(entry.url)}
      </a>
    ),
  ].filter(Boolean);

  return (
    <div className="doc-entry-head">
      <div className="doc-entry-row">
        <span className="doc-entry-heading">
          {lead}
          {inline && first && second && (
            <span className="doc-entry-separator" data-separator={style.placement} aria-hidden={style.placement === "bar"}>
              {style.placement === "comma" ? ", " : null}
            </span>
          )}
          {inline && second}
        </span>
        {dates && <span className="doc-entry-dates">{dates}</span>}
      </div>
      {meta.length > 0 && (
        <div className="doc-entry-meta">
          {meta.map((m, i) => (
            <span key={i} className="doc-entry-meta-item">
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function hasEntryContent(entry: Entry) {
  return Boolean(entry.title || entry.subtitle || entry.level || entry.url || !isRichTextEmpty(entry.description));
}

function sectionBlocks(section: ResumeContent["sections"][number], design: DocumentDesign): Block[] {
  if (!section.visible) return [];

  if (section.type === "profile") {
    const chunks = richTextChunks(section.content, section.id);
    if (chunks.length === 0) return [];
    return chunks.map((chunk, i) => ({
      key: chunk.key,
      gap: i === 0 ? design.sectionSpacing : chunkGap(chunk, design),
      node:
        i === 0 ? (
          <section>
            {section.title && <SectionTitle>{section.title}</SectionTitle>}
            {chunk.node}
          </section>
        ) : (
          chunk.node
        ),
    }));
  }

  const entries = section.entries.filter((e) => e.visible && hasEntryContent(e));
  if (entries.length === 0) return [];
  const compact = SECTION_CONFIG[section.type].compact;

  const blocks: Block[] = [];
  entries.forEach((entry, entryIndex) => {
    const chunks = richTextChunks(entry.description, entry.id);
    const [first, ...rest] = chunks;
    const head = (
      <div className="doc-entry">
        <EntryHeading entry={entry} section={section} design={design} />
        {first && <div className="doc-entry-body">{first.node}</div>}
      </div>
    );
    blocks.push({
      key: entry.id,
      gap:
        entryIndex === 0
          ? design.sectionSpacing
          : compact
            ? Math.max(2, Math.round(design.entrySpacing / 2))
            : design.entrySpacing,
      // The section title travels with the first entry so it never ends up alone at a page bottom.
      node:
        entryIndex === 0 ? (
          <section>
            {section.title && <SectionTitle>{section.title}</SectionTitle>}
            {head}
          </section>
        ) : (
          head
        ),
    });
    for (const chunk of rest) {
      blocks.push({
        key: chunk.key,
        gap: chunkGap(chunk, design),
        node: <div className="doc-entry-body">{chunk.node}</div>,
      });
    }
  });
  return blocks;
}

export function buildResumeBlocks(content: ResumeContent, design: DocumentDesign): DocumentBlocks {
  const main: Block[] = [];
  const sidebar: Block[] = [];
  for (const section of content.sections) {
    const column =
      design.columns === 2 ? (design.sectionColumns[section.id] ?? defaultColumnFor(section.type)) : "main";
    (column === "sidebar" ? sidebar : main).push(...sectionBlocks(section, design));
  }
  return { header: <DocumentHeader personal={content.personal} design={design} />, main, sidebar };
}
