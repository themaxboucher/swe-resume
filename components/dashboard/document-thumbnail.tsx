"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildCoverLetterBlocks } from "@/components/document/cover-letter-blocks";
import { PagedDocument } from "@/components/document/paged-document";
import { buildVersionBlocks } from "@/components/document/resume-blocks";
import { pageDimensions } from "@/components/document/types";
import type { CoverLetterContent, DocumentDesign, ResumeContent } from "@/lib/documents/schema";
import type { VersionLayout } from "@/lib/documents/versions";

type Props =
  | { kind: "resume"; content: ResumeContent; layout: VersionLayout; design: DocumentDesign }
  | { kind: "cover-letter"; content: CoverLetterContent; design: DocumentDesign };

/** First page of a document, scaled to the card width. */
export function DocumentThumbnail(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = props.kind === "resume" ? props.layout : null;
  const blocks = useMemo(
    () =>
      props.kind === "resume"
        ? buildVersionBlocks(props.content, layout!, props.design)
        : buildCoverLetterBlocks(props.content, props.design),
    [props.kind, props.content, props.design, layout],
  );
  const dims = pageDimensions(props.design.pageSize);

  return (
    <div ref={ref} className="w-full overflow-hidden bg-white" style={{ aspectRatio: `${dims.width} / ${dims.height}` }}>
      {width > 0 && (
        <PagedDocument blocks={blocks} design={props.design} scale={width / dims.width} maxPages={1} pageGap={0} />
      )}
    </div>
  );
}
