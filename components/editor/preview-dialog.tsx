"use client";

import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { PagedDocument } from "@/components/document/paged-document";
import { pageDimensions, type DocumentBlocks } from "@/components/document/types";
import type { DocumentDesign } from "@/lib/documents/schema";

/** Largest zoom the enlarged preview grows to on wide screens. */
const MAX_SCALE = 1.25;

const PAGE_CLASS = "shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_24px_60px_-20px_rgb(0_0_0/0.5)]";

// Web links open in a new tab so the editor stays put; mailto:/tel: links go to the mail or phone app.
export function openDocumentLink(event: MouseEvent<HTMLElement>) {
  const href = (event.target as HTMLElement).closest(".doc-page a[href]")?.getAttribute("href");
  if (!href || !/^https?:/i.test(href)) return;
  event.preventDefault();
  window.open(href, "_blank", "noopener,noreferrer");
}

type PreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: DocumentBlocks;
  design: DocumentDesign;
};

export function PreviewDialog({ open, onOpenChange, blocks, design }: PreviewDialogProps) {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [viewport]);

  const pageWidth = pageDimensions(design.pageSize).width;
  const scale = availableWidth ? Math.min(MAX_SCALE, availableWidth / pageWidth) : 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Viewport
          ref={setViewport}
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain px-4 pt-16 pb-10 sm:px-20 sm:pt-12"
        >
          <Dialog.Popup
            initialFocus={closeRef}
            className="mx-auto w-fit outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
            onClick={openDocumentLink}
          >
            <Dialog.Title className="sr-only">Document preview</Dialog.Title>
            {scale > 0 && (
              <div className="duration-200 animate-in zoom-in-[0.97]">
                <PagedDocument
                  blocks={blocks}
                  design={design}
                  scale={scale}
                  pageGap={24 / scale}
                  className="[&_.doc-page_a:hover]:underline"
                  pageClassName={PAGE_CLASS}
                />
              </div>
            )}
            <Dialog.Close
              ref={closeRef}
              aria-label="Close preview"
              className="fixed top-3 right-3 flex size-11 items-center justify-center rounded-xl bg-white text-neutral-900 shadow-lg transition-colors outline-none hover:bg-neutral-100 focus-visible:ring-3 focus-visible:ring-white/60 sm:top-4 sm:right-4"
            >
              <XIcon className="size-6" strokeWidth={2.25} />
            </Dialog.Close>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
