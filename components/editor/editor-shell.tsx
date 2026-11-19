"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckIcon,
  DownloadIcon,
  EyeIcon,
  Loader2Icon,
  PaletteIcon,
  PencilLineIcon,
  Redo2Icon,
  Undo2Icon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { PagedDocument } from "@/components/document/paged-document";
import { pageDimensions, type DocumentBlocks } from "@/components/document/types";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DocumentDesign } from "@/lib/documents/schema";
import { cn } from "@/lib/utils";
import { useDocument, useHistory, type DocumentStoreState, type SaveStatus } from "./document-store";

type EditorShellProps<C> = {
  kind: "resume" | "cover-letter";
  id: string;
  saveStatus: SaveStatus;
  flush: () => Promise<void>;
  form: ReactNode;
  designPanel: ReactNode;
  buildBlocks: (content: C, design: DocumentDesign) => DocumentBlocks;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function EditorShell<C>({ kind, id, saveStatus, flush, form, designPanel, buildBlocks }: EditorShellProps<C>) {
  const [panel, setPanel] = useState<"content" | "design">("content");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const { undo, redo, canUndo, canRedo } = useHistory();

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
        <TitleInput />
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
          <DownloadButton kind={kind} id={id} flush={flush} />
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
        <PreviewPane<C> buildBlocks={buildBlocks} className={cn(mobileView === "edit" && "hidden lg:flex")} />
      </div>
    </div>
  );
}

function TitleInput() {
  const title = useDocument<unknown, string>((s) => s.title);
  const setTitle = useDocument<unknown, (t: string) => void>((s) => s.setTitle);
  return (
    <input
      aria-label="Document title"
      value={title}
      maxLength={120}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={(e) => !e.target.value.trim() && setTitle("Untitled")}
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

function DownloadButton({ kind, id, flush }: { kind: string; id: string; flush: () => Promise<void> }) {
  const title = useDocument<unknown, string>((s) => s.title);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      await flush();
      const response = await fetch(`/api/pdf/${kind}/${id}`);
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title.trim().replace(/[\\/:*?"<>|]+/g, "-") || "document"}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't generate the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={download} disabled={busy} className="ml-1">
      {busy ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
      <span className="hidden sm:inline">{busy ? "Preparing…" : "Download PDF"}</span>
      <span className="sm:hidden">PDF</span>
    </Button>
  );
}

const PREVIEW_PADDING = 32;

function PreviewPane<C>({
  buildBlocks,
  className,
}: {
  buildBlocks: (content: C, design: DocumentDesign) => DocumentBlocks;
  className?: string;
}) {
  const content = useDocument<C, C>((s: DocumentStoreState<C>) => s.content);
  const design = useDocument<C, DocumentDesign>((s) => s.design);
  const blocks = useMemo(() => buildBlocks(content, design), [buildBlocks, content, design]);
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

  // Web links open in a new tab so the editor stays put; mailto:/tel: links go to the mail or phone app.
  const openLink = (event: MouseEvent<HTMLDivElement>) => {
    const href = (event.target as HTMLElement).closest(".doc-page a[href]")?.getAttribute("href");
    if (!href || !/^https?:/i.test(href)) return;
    event.preventDefault();
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const pageWidth = pageDimensions(design.pageSize).width;
  const scale = availableWidth ? Math.min(1, (availableWidth - PREVIEW_PADDING * 2) / pageWidth) : 0;

  return (
    <div
      ref={containerRef}
      className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[#ececec]", className)}
      onClick={openLink}
    >
      <div className="flex justify-center" style={{ padding: PREVIEW_PADDING }}>
        {scale > 0 && (
          <PagedDocument
            blocks={blocks}
            design={design}
            scale={scale}
            pageGap={24 / scale}
            className="[&_.doc-page_a:hover]:underline"
            pageClassName="shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_18px_40px_-24px_rgb(0_0_0/0.45)]"
            onPageCount={setPageCount}
          />
        )}
      </div>
      <div className="pointer-events-none sticky bottom-4 mt-auto flex justify-center">
        <span className="rounded-full bg-foreground/85 px-3 py-1 text-xs font-medium text-background backdrop-blur">
          {pageCount} {pageCount === 1 ? "page" : "pages"} · {design.pageSize === "A4" ? "A4" : "US Letter"}
        </span>
      </div>
    </div>
  );
}
