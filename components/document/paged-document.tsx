"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { DocumentDesign } from "@/lib/documents/schema";
import { cn } from "@/lib/utils";
import { DOCUMENT_FONTS } from "./document-fonts";
import { MM_TO_PX, pageDimensions, type Block, type DocumentBlocks } from "./types";
import "./document.css";

const COLUMN_GAP_MM = 7;
/** Tolerance for sub-pixel rounding differences between measurement and print. */
const FIT_EPSILON = 0.5;

/** Pages per column, as block keys (keys stay valid across re-renders; indices would not). */
type Layout = { hasHeader: boolean; main: string[][]; sidebar: string[][] };

function paginate(heights: number[], gaps: number[], pageHeight: number, headerHeight: number): number[][] {
  const hasHeader = headerHeight > 0;
  const pages: number[][] = [[]];
  let used = headerHeight;
  heights.forEach((height, i) => {
    let page = pages[pages.length - 1];
    const startsFreshPage = page.length === 0 && !(pages.length === 1 && hasHeader);
    let gap = startsFreshPage ? 0 : gaps[i];
    if (used + gap + height > pageHeight + FIT_EPSILON && !startsFreshPage) {
      page = [];
      pages.push(page);
      used = 0;
      gap = 0;
    }
    page.push(i);
    used += gap + height;
  });
  return pages;
}

function sameLayout(a: Layout | null, b: Layout) {
  return a !== null && JSON.stringify(a) === JSON.stringify(b);
}

type PagedDocumentProps = {
  blocks: DocumentBlocks;
  design: DocumentDesign;
  /** Visual scale of the rendered pages (measurement always happens at 1). */
  scale?: number;
  /** Space between pages in unscaled px. */
  pageGap?: number;
  maxPages?: number;
  pageClassName?: string;
  className?: string;
  onPageCount?: (count: number) => void;
  /** Called once fonts are loaded and the layout is final. */
  onReady?: () => void;
};

export function PagedDocument({
  blocks,
  design,
  scale = 1,
  pageGap = 24,
  maxPages,
  pageClassName,
  className,
  onPageCount,
  onReady,
}: PagedDocumentProps) {
  const dims = pageDimensions(design.pageSize);
  const marginX = design.marginX * MM_TO_PX;
  const marginY = design.marginY * MM_TO_PX;
  const contentWidth = dims.width - marginX * 2;
  const contentHeight = dims.height - marginY * 2;
  const twoColumns = design.columns === 2 && blocks.sidebar.length > 0;
  const columnGap = twoColumns ? COLUMN_GAP_MM * MM_TO_PX : 0;
  const sidebarWidth = twoColumns ? (contentWidth * design.sidebarWidth) / 100 : 0;
  const mainWidth = contentWidth - sidebarWidth - columnGap;

  const measureRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  const compute = useCallback(() => {
    const root = measureRef.current;
    if (!root) return;
    const height = (el: Element | null) => el?.getBoundingClientRect().height ?? 0;
    const headerHeight = height(root.querySelector("[data-measure=header]"));
    const paginateColumn = (column: "main" | "sidebar", columnBlocks: Block[]) => {
      const heights = Array.from(root.querySelectorAll(`[data-measure=${column}] > [data-block]`), height);
      const pages = paginate(
        heights,
        columnBlocks.map((b) => b.gap),
        contentHeight,
        headerHeight,
      );
      return pages.map((page) => page.map((i) => columnBlocks[i].key));
    };
    const next: Layout = {
      hasHeader: headerHeight > 0,
      main: paginateColumn("main", blocks.main),
      sidebar: twoColumns ? paginateColumn("sidebar", blocks.sidebar) : [],
    };
    setLayout((prev) => (sameLayout(prev, next) ? prev : next));
  }, [blocks, contentHeight, twoColumns]);

  // Re-measure after every render: content edits change block heights.
  useLayoutEffect(() => {
    compute();
  });

  // Web fonts load asynchronously and change text metrics; re-measure when they arrive.
  const computeRef = useRef(compute);
  useLayoutEffect(() => {
    computeRef.current = compute;
  });
  const onReadyRef = useRef(onReady);
  useLayoutEffect(() => {
    onReadyRef.current = onReady;
  });
  const fontFamily = DOCUMENT_FONTS[design.fontFamily];
  useEffect(() => {
    let cancelled = false;
    const handler = () => computeRef.current();
    document.fonts.addEventListener("loadingdone", handler);
    const size = `${design.fontSize}pt`;
    Promise.all(
      ["400", "italic 400", "600", "700"].map((variant) =>
        document.fonts.load(`${variant} ${size} ${fontFamily}`).catch(() => []),
      ),
    )
      .then(() => document.fonts.ready)
      .then(() => {
        if (cancelled) return;
        computeRef.current();
        // Let React commit the final layout before signalling readiness.
        requestAnimationFrame(() => requestAnimationFrame(() => !cancelled && onReadyRef.current?.()));
      });
    return () => {
      cancelled = true;
      document.fonts.removeEventListener("loadingdone", handler);
    };
  }, [fontFamily, design.fontSize]);

  const pageCount = layout ? Math.max(layout.main.length, layout.sidebar.length, 1) : 1;
  const visiblePages = maxPages ? Math.min(pageCount, maxPages) : pageCount;

  useEffect(() => {
    onPageCount?.(pageCount);
  }, [pageCount, onPageCount]);

  const rootStyle = {
    "--doc-font": fontFamily,
    "--doc-font-size": `${design.fontSize}pt`,
    "--doc-name-size": `${design.fontSize + design.nameSize}pt`,
    "--doc-heading-size": `${design.fontSize + design.headingSize}pt`,
    "--doc-heading-tracking": `${design.headingLetterSpacing}em`,
    "--doc-entry-title-size": `${design.fontSize + design.entryTitleSize}pt`,
    "--doc-line-height": design.lineHeight,
    "--doc-accent": design.accentColor,
    "--doc-muted": design.mutedTextColor,
  } as CSSProperties;

  const renderColumn = (columnBlocks: Block[], keys: string[] | undefined, pageIndex: number, hasHeader: boolean) => {
    const byKey = new Map(columnBlocks.map((block) => [block.key, block]));
    return (keys ?? [])
      .map((key) => byKey.get(key))
      .filter((block): block is Block => block !== undefined)
      .map((block, i) => {
        const startsFreshPage = i === 0 && !(pageIndex === 0 && hasHeader);
        return (
          <div key={block.key} className="doc-block" style={{ marginTop: startsFreshPage ? 0 : block.gap }}>
            {block.node}
          </div>
        );
      });
  };

  const hasHeader = layout?.hasHeader ?? true;
  const totalHeight = visiblePages * dims.height + (visiblePages - 1) * pageGap;

  return (
    <div
      className={cn("doc-root relative", className)}
      style={rootStyle}
      data-header-align={design.headerAlign}
    >
      {/* Off-screen measurement copy, laid out at exactly the page column widths. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 -z-10 overflow-hidden"
        style={{ width: 0, height: 0 }}
      >
        <div data-measure="header" className="doc-block" style={{ width: contentWidth }}>
          {blocks.header}
        </div>
        <div data-measure="main" className="doc-col-main" style={{ width: mainWidth }}>
          {blocks.main.map((block) => (
            <div key={block.key} data-block className="doc-block">
              {block.node}
            </div>
          ))}
        </div>
        {twoColumns && (
          <div data-measure="sidebar" className="doc-col-sidebar" style={{ width: sidebarWidth }}>
            {blocks.sidebar.map((block) => (
              <div key={block.key} data-block className="doc-block">
                {block.node}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ width: dims.width * scale, height: totalHeight * scale }}>
        <div style={{ width: dims.width, transform: scale === 1 ? undefined : `scale(${scale})`, transformOrigin: "0 0" }}>
          {Array.from({ length: visiblePages }, (_, pageIndex) => (
            <div
              key={pageIndex}
              className={cn("doc-page", pageClassName)}
              style={{
                width: `${dims.widthMm}mm`,
                height: `${dims.heightMm}mm`,
                padding: `${design.marginY}mm ${design.marginX}mm`,
                marginTop: pageIndex === 0 ? 0 : pageGap,
              }}
            >
              {pageIndex === 0 && hasHeader && <div className="doc-block">{blocks.header}</div>}
              <div
                className="flex items-start"
                style={{ gap: columnGap, flexDirection: design.sidebarSide === "left" ? "row-reverse" : "row" }}
              >
                <div className="doc-col-main shrink-0" style={{ width: mainWidth }}>
                  {renderColumn(blocks.main, layout?.main[pageIndex], pageIndex, hasHeader)}
                </div>
                {twoColumns && (
                  <div className="doc-col-sidebar shrink-0" style={{ width: sidebarWidth }}>
                    {renderColumn(blocks.sidebar, layout?.sidebar[pageIndex], pageIndex, hasHeader)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
