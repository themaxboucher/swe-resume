"use client";

import {
  CopyIcon,
  DownloadIcon,
  FilePlus2Icon,
  FileTextIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/time";

export type GridItem = { id: string; title: string; updatedAt: Date; thumbnail: ReactNode };

type DocumentGridProps = {
  noun: string;
  items: GridItem[] | undefined;
  isError: boolean;
  creating: boolean;
  hrefFor: (id: string) => string;
  downloadFor: (item: GridItem) => { url: string; fileName: string };
  onCreateBlank: () => void;
  /** Replaces the default "blank or duplicate" chooser behind the New card. */
  onNew?: () => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, title: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  /** False hides Delete, e.g. for the last remaining version. */
  canDelete?: boolean;
  deleteDescription?: string;
  emptyIllustration: ReactNode;
};

export function DocumentGrid(props: DocumentGridProps) {
  const { items, noun, creating } = props;
  const [chooserOpen, setChooserOpen] = useState(false);

  const startCreate = () => {
    if (props.onNew) props.onNew();
    else if (items && items.length > 0) setChooserOpen(true);
    else props.onCreateBlank();
  };

  if (props.isError) {
    return <p className="py-16 text-center text-muted-foreground">Couldn&apos;t load your {noun}s. Refresh to try again.</p>;
  }

  if (!items) {
    return (
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-[210/297] rounded-xl" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="dashed-panel flex flex-col items-center gap-5 bg-card/60 px-6 py-16 text-center">
        {props.emptyIllustration}
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-2xl font-semibold">Start your first {noun}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Fill in the form, watch it lay out on real pages, then download a PDF.
          </p>
        </div>
        <Button size="lg" onClick={props.onCreateBlank} disabled={creating}>
          {creating ? <Loader2Icon className="animate-spin" /> : <PlusIcon />} Create {noun}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <DocumentCard key={item.id} item={item} {...props} />
        ))}
        <button
          type="button"
          onClick={startCreate}
          disabled={creating}
          className="dashed-panel group flex aspect-[210/297] flex-col items-center justify-center gap-3 bg-card/40 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-card hover:text-primary"
        >
          <span className="flex size-12 items-center justify-center rounded-full border border-border bg-card transition-transform group-hover:scale-105">
            {creating ? <Loader2Icon className="size-5 animate-spin" /> : <PlusIcon className="size-5" />}
          </span>
          <span className="text-sm font-semibold">New {noun}</span>
        </button>
      </div>
      <CreateChooser
        open={chooserOpen}
        onOpenChange={setChooserOpen}
        noun={noun}
        items={items}
        onBlank={() => {
          setChooserOpen(false);
          props.onCreateBlank();
        }}
        onDuplicate={(id) => {
          setChooserOpen(false);
          props.onDuplicate(id);
        }}
      />
    </>
  );
}

function DocumentCard({
  item,
  noun,
  hrefFor,
  downloadFor,
  onDuplicate,
  onRename,
  onDelete,
  canDelete = true,
  deleteDescription,
}: { item: GridItem } & DocumentGridProps) {
  const href = hrefFor(item.id);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const { url: pdfUrl, fileName } = downloadFor(item);
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error(await response.text());
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName.replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Couldn't generate the PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="group flex min-w-0 flex-col gap-3">
      {/* The thumbnail contains its own links, so the card link is an overlay sibling rather than a wrapper. */}
      <div className="relative overflow-hidden rounded-xl shadow-card transition-all group-hover:-translate-y-0.5 group-hover:shadow-[0_0_0_1px_rgb(0_0_0/0.1),0_22px_40px_-24px_rgb(0_0_0/0.5)]">
        <div className="pointer-events-none" aria-hidden inert>
          {item.thumbnail}
        </div>
        <Link
          href={href}
          className="absolute inset-0 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          aria-label={`Open ${item.title}`}
        />
        {downloading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2Icon className="size-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="flex items-start gap-1">
        <Link href={href} className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.title}</p>
          <p className="text-xs text-muted-foreground">Edited {timeAgo(item.updatedAt)}</p>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label={`${item.title} options`} className="-mr-1" />}
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setRenameOpen(true)}>
              <PencilIcon /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(item.id)}>
              <CopyIcon /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={download} disabled={downloading}>
              <DownloadIcon /> Download PDF
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2Icon /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        initial={item.title}
        onSubmit={async (title) => {
          await onRename(item.id, title);
          setRenameOpen(false);
        }}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{item.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDescription ?? `This permanently deletes the ${noun}. It can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white shadow-none hover:bg-destructive/90"
              onClick={async () => {
                await onDelete(item.id);
                setDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RenameDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: string;
  onSubmit: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial);
  const [pending, setPending] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setTitle(initial);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            setPending(true);
            try {
              await onSubmit(title.trim());
            } finally {
              setPending(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <Input autoFocus value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
          <DialogFooter>
            <Button type="submit" disabled={pending || !title.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateChooser({
  open,
  onOpenChange,
  noun,
  items,
  onBlank,
  onDuplicate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noun: string;
  items: GridItem[];
  onBlank: () => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold">New {noun}</DialogTitle>
          <DialogDescription>Start fresh, or copy one you&apos;ve already written and tailor it.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={onBlank}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FilePlus2Icon className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Start blank</span>
              <span className="block text-xs text-muted-foreground">Empty sections with your name and email filled in.</span>
            </span>
          </button>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Or duplicate</p>
            <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onDuplicate(item.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
                  >
                    <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(item.updatedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
