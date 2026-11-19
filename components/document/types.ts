import type { ReactNode } from "react";

/** An unbreakable unit of content. The paginator never splits a block across pages. */
export type Block = {
  key: string;
  /** Space (px) above this block, dropped when the block starts a page. */
  gap: number;
  node: ReactNode;
};

export type DocumentBlocks = {
  /** Rendered full-width at the top of the first page. */
  header: ReactNode;
  main: Block[];
  /** Only used when the design has two columns. */
  sidebar: Block[];
};

export const MM_TO_PX = 96 / 25.4;

export const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 215.9, height: 279.4 },
} as const;

export function pageDimensions(pageSize: keyof typeof PAGE_SIZES) {
  const { width, height } = PAGE_SIZES[pageSize];
  return { widthMm: width, heightMm: height, width: width * MM_TO_PX, height: height * MM_TO_PX };
}
