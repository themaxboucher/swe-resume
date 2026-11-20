"use client";

import { Loader2Icon } from "lucide-react";
import { useId, useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentDesign } from "@/lib/documents/schema";
import { VersionGlyph } from "./version-controls";

type VersionOption = { id: string; name: string; design: DocumentDesign };

const NAME_EXAMPLES = "e.g. Embedded, Web, Print";

/** Name a new version and pick the version it starts as a copy of. */
export function NewVersionDialog({
  open,
  onOpenChange,
  versions,
  defaultSourceId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: VersionOption[];
  defaultSourceId: string;
  onCreate: (input: { name: string; sourceId: string }) => Promise<unknown> | void;
}) {
  const nameId = useId();
  const sourceLabelId = useId();
  const [name, setName] = useState("");
  const [sourceId, setSourceId] = useState(defaultSourceId);
  const [pending, setPending] = useState(false);
  const items = versions.map((v) => ({ value: v.id, label: v.name }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setName("");
          setSourceId(defaultSourceId);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          className="flex flex-col gap-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!name.trim()) return;
            setPending(true);
            try {
              await onCreate({ name: name.trim(), sourceId });
              onOpenChange(false);
            } finally {
              setPending(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-semibold">New version</DialogTitle>
            <DialogDescription>
              It starts as a copy of another version: what it shows, its order and its design. Your text stays shared.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={nameId}>Name</Label>
              <Input
                id={nameId}
                autoFocus
                value={name}
                maxLength={60}
                placeholder={NAME_EXAMPLES}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label id={sourceLabelId}>Start from</Label>
              <Select items={items} value={sourceId} onValueChange={(next) => next && setSourceId(next)}>
                <SelectTrigger aria-labelledby={sourceLabelId} className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      <VersionGlyph design={version.design} />
                      {version.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending && <Loader2Icon className="animate-spin" />}
              Create version
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RenameVersionDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: string;
  onSubmit: (name: string) => Promise<unknown> | void;
}) {
  const [name, setName] = useState(initial);
  const [pending, setPending] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setName(initial);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!name.trim()) return;
            setPending(true);
            try {
              await onSubmit(name.trim());
              onOpenChange(false);
            } finally {
              setPending(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename version</DialogTitle>
            <DialogDescription>Only you see version names. Downloads use your resume&apos;s file name.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            aria-label="Version name"
            value={name}
            maxLength={60}
            placeholder={NAME_EXAMPLES}
            onChange={(e) => setName(e.target.value)}
          />
          <DialogFooter>
            <Button type="submit" disabled={pending || !name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteVersionDialog({
  open,
  onOpenChange,
  name,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onConfirm: () => Promise<unknown> | void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Your resume&apos;s text stays. Only this version&apos;s choices of what to show, its order and its design
            are removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white shadow-none hover:bg-destructive/90"
            onClick={async () => {
              await onConfirm();
              onOpenChange(false);
            }}
          >
            Delete version
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
