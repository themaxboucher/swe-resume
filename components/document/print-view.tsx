"use client";

import { useMemo } from "react";
import type { CoverLetterContent, DocumentDesign, ResumeContent } from "@/lib/documents/schema";
import { buildCoverLetterBlocks } from "./cover-letter-blocks";
import { PagedDocument } from "./paged-document";
import { buildResumeBlocks } from "./resume-blocks";
import { PAGE_SIZES } from "./types";

type Props =
  | { kind: "resume"; content: ResumeContent; design: DocumentDesign }
  | { kind: "cover-letter"; content: CoverLetterContent; design: DocumentDesign };

/** Renders a document exactly as the editor preview does, at 1:1, for headless Chromium to print. */
export function PrintView(props: Props) {
  const blocks = useMemo(
    () =>
      props.kind === "resume"
        ? buildResumeBlocks(props.content, props.design)
        : buildCoverLetterBlocks(props.content, props.design),
    [props.kind, props.content, props.design],
  );
  const page = PAGE_SIZES[props.design.pageSize];

  return (
    <>
      <style>{`
        @page { size: ${page.width}mm ${page.height}mm; margin: 0; }
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; min-height: 0 !important; }
        body > section[aria-label*="Notifications"] { display: none; }
      `}</style>
      <PagedDocument
        blocks={blocks}
        design={props.design}
        pageGap={0}
        onReady={() => {
          document.documentElement.dataset.docReady = "true";
        }}
      />
    </>
  );
}
