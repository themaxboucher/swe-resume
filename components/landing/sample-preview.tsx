"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PagedDocument } from "@/components/document/paged-document";
import { buildResumeBlocks } from "@/components/document/resume-blocks";
import { pageDimensions } from "@/components/document/types";
import { SAMPLE_DESIGN, SAMPLE_RESUME } from "@/lib/documents/sample";

const ACCENTS = ["#0084d1", "#0f766e", "#be123c", "#1f1f1f"];

export function SamplePreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [accent, setAccent] = useState(ACCENTS[0]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const design = useMemo(() => ({ ...SAMPLE_DESIGN, accentColor: accent }), [accent]);
  const blocks = useMemo(() => buildResumeBlocks(SAMPLE_RESUME, design), [design]);
  const dims = pageDimensions(design.pageSize);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={ref}
        className="w-full overflow-hidden rounded-sm bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_30px_60px_-30px_rgb(0_0_0/0.45)]"
        style={{ aspectRatio: `${dims.width} / ${dims.height}` }}
      >
        {width > 0 && <PagedDocument blocks={blocks} design={design} scale={width / dims.width} maxPages={1} pageGap={0} />}
      </div>
      <div className="flex items-center gap-2 rounded-full bg-card px-3 py-2 shadow-raised">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Try a color</span>
        {ACCENTS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Accent ${color}`}
            aria-pressed={accent === color}
            onClick={() => setAccent(color)}
            className="size-6 rounded-full ring-1 ring-black/10 transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-foreground aria-pressed:ring-offset-2"
            style={{ background: color }}
          />
        ))}
      </div>
    </div>
  );
}
