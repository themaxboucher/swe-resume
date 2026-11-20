"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  EyeIcon,
  Loader2Icon,
  PaletteIcon,
  PencilLineIcon,
  Redo2Icon,
  Undo2Icon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PagedDocument } from "@/components/document/paged-document";
import { pageDimensions, type DocumentBlocks } from "@/components/document/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DocumentDesign } from "@/lib/documents/schema";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "./document-store";
import { useEditorHistory } from "./history";
import { openDocumentLink, PreviewDialog } from "./preview-dialog";

export type DownloadConfig = {
  /** PDF endpoint for what's currently open. */
  url: string;
  fileName: string;
  /** Pushes pending edits before the PDF renders. */
  flush: () => Promise<void>;
  /** Extra controls (e.g. the file name) in a menu beside the button. */
  settings?: ReactNode;
};

type EditorShellProps = {
  /** Title or version picker shown in the top bar. */
  title: ReactNode;
  saveStatus: SaveStatus;
  download: DownloadConfig;
  form: ReactNode;
  designPanel: ReactNode;
  /** Usually a <PreviewPane />. */
  preview: ReactNode;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function EditorShell({ title, saveStatus, download, form, designPanel, preview }: EditorShellProps) {
  const [panel, setPanel] = useState<"content" | "design">("content");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const { undo, redo, canUndo, canRedo } = useEditorHistory();

  // Document-level undo/redo when focus isn't inside a text field (fields keep their native undo).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z" || isEditableTarget(event.target)) return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-2 sm:px-3">
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/dashboard" />} />}
          >
            <ArrowLeftIcon />
            <span className="sr-only">Back to dashboard</span>
          </TooltipTrigger>
          <TooltipContent>Back to dashboard</TooltipContent>
        </Tooltip>
        {title}
        <SaveIndicator status={saveStatus} />
        <div className="ml-auto flex items-center gap-1">
          <div className="hidden items-center sm:flex">
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} />}>
                <Undo2Icon />
                <span className="sr-only">Undo</span>
              </TooltipTrigger>
              <TooltipContent>Undo (⌘Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} />}>
                <Redo2Icon />
                <span className="sr-only">Redo</span>
              </TooltipTrigger>
              <TooltipContent>Redo (⇧⌘Z)</TooltipContent>
            </Tooltip>
          </div>
          <DownloadButton {...download} />
        </div>
      </header>

      {/* Mobile: switch between form and preview */}
      <div className="flex shrink-0 gap-1 border-b border-border bg-card p-1.5 lg:hidden">
        {(
          [
            ["edit", "Edit", PencilLineIcon],
            ["preview", "Preview", EyeIcon],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMobileView(value)}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-muted-foreground",
              mobileView === value && "bg-muted text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "flex min-h-0 w-full flex-col border-border lg:w-[min(46vw,560px)] lg:shrink-0 lg:border-r",
            mobileView === "preview" && "hidden lg:flex",
          )}
        >
          <div className="flex shrink-0 gap-1 px-4 pt-4">
            {(
              [
                ["content", "Content", PencilLineIcon],
                ["design", "Design", PaletteIcon],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPanel(value)}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
                  panel === value && "bg-foreground text-background hover:text-background",
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-24">
            <div className={cn(panel !== "content" && "hidden")}>{form}</div>
            <div className={cn(panel !== "design" && "hidden")}>{designPanel}</div>
          </div>
        </aside>
        <div className={cn("flex min-h-0 min-w-0 flex-1", mobileView === "edit" && "hidden lg:flex")}>{preview}</div>
      </div>
    </div>
  );
}

/** Editable document title, for documents that have one (cover letters). */
export function TitleInput({ value, onChange }: { value: string; onChange: (title: string) => void }) {
  return (
    <input
      aria-label="Document title"
      value={value}
      maxLength={120}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => !e.target.value.trim() && onChange("Untitled")}
      className="h-9 min-w-0 flex-1 truncate rounded-md bg-transparent px-2 text-[15px] font-semibold outline-none hover:bg-muted focus:bg-muted sm:max-w-80 sm:flex-none"
    />
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const content = {
    saved: { icon: <CheckIcon />, label: "Saved" },
    unsaved: { icon: <span className="size-1.5 rounded-full bg-muted-foreground" />, label: "Unsaved" },
    saving: { icon: <Loader2Icon className="animate-spin" />, label: "Saving…" },
    error: { icon: <AlertCircleIcon />, label: "Couldn't save — retrying" },
  }[status];
  return (
    <span
      role="status"
      className={cn(
        "hidden shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground sm:flex [&_svg]:size-3.5",
        status === "error" && "text-destructive",
      )}
    >
      {content.icon}
      {content.label}
    </span>
  );
}

function DownloadButton({ url, fileName, flush, settings }: DownloadConfig) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      await flush();
      const response = await fetch(url);
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${fileName.trim().replace(/[\\/:*?"<>|]+/g, "-") || "document"}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't generate the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const button = (
    <Button onClick={download} disabled={busy} className={cn(settings ? "rounded-r-none" : "ml-1")}>
      {busy ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
      <span className="hidden sm:inline">{busy ? "Preparing…" : "Download PDF"}</span>
      <span className="sm:hidden">PDF</span>
    </Button>
  );
  if (!settings) return button;

  return (
    <div className="ml-1 flex items-center">
      {button}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              aria-label="Download settings"
              className="w-8 rounded-l-none border-l border-l-white/25 px-0"
            />
          }
        >
          <ChevronDownIcon />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          {settings}
        </PopoverContent>
      </Popover>
    </div>
  );
}

const PREVIEW_PADDING = 32;

export function PreviewPane({ blocks, design }: { blocks: DocumentBlocks; design: DocumentDesign }) {
  const [pageCount, setPageCount] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [zoomed, setZoomed] = useState(false);

  const pageWidth = pageDimensions(design.pageSize).width;
  const scale = availableWidth ? Math.min(1, (availableWidth - PREVIEW_PADDING * 2) / pageWidth) : 0;

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[#ececec]"
      onClick={openDocumentLink}
    >
      <div className="flex justify-center" style={{ padding: PREVIEW_PADDING }}>
        {scale > 0 && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Enlarge preview"
            className="cursor-zoom-in rounded-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={(event) => {
              if (!(event.target as HTMLElement).closest("a[href]")) setZoomed(true);
            }}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
              event.preventDefault();
              setZoomed(true);
            }}
          >
            <PagedDocument
              blocks={blocks}
              design={design}
              scale={scale}
              pageGap={24 / scale}
              className="[&_.doc-page_a:hover]:underline"
              pageClassName="shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_18px_40px_-24px_rgb(0_0_0/0.45)]"
              onPageCount={setPageCount}
            />
          </div>
        )}
      </div>
      <PreviewDialog open={zoomed} onOpenChange={setZoomed} blocks={blocks} design={design} />
      <div className="pointer-events-none sticky bottom-4 mt-auto flex justify-center">
        <span className="rounded-full bg-foreground/85 px-3 py-1 text-xs font-medium text-background backdrop-blur">
          {pageCount} {pageCount === 1 ? "page" : "pages"} · {design.pageSize === "A4" ? "A4" : "US Letter"}
        </span>
      </div>
    </div>
  );
}
