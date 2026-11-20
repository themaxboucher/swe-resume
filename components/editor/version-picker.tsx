"use client";

import { CheckIcon, ChevronsUpDownIcon, CopyIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditorHistory } from "./history";
import { createVersion, deleteVersion, useActiveVersion, useResume, useUpdate } from "./resume-store";
import { VersionGlyph } from "./version-controls";
import { DeleteVersionDialog, NewVersionDialog, RenameVersionDialog } from "./version-dialogs";

/** "Resume / Embedded ▾" in the editor's top bar: switch, create, rename, duplicate and delete versions. */
export function VersionPicker() {
  const versions = useResume((s) => s.versions);
  const setActiveVersion = useResume((s) => s.setActiveVersion);
  const active = useActiveVersion();
  const update = useUpdate();
  const { undo } = useEditorHistory();
  const [dialog, setDialog] = useState<"new" | "rename" | "delete" | null>(null);
  const closeDialog = (open: boolean) => !open && setDialog(null);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="hidden pl-1 text-[15px] font-semibold text-muted-foreground sm:inline">Resume</span>
      <span aria-hidden className="hidden text-muted-foreground/40 sm:inline">
        /
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Version: ${active.name}. Switch or manage versions`}
              className="flex h-9 min-w-0 items-center gap-2 rounded-lg px-2 text-[15px] font-semibold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 aria-expanded:bg-muted"
            />
          }
        >
          <VersionGlyph design={active.design} />
          <span className="max-w-40 truncate sm:max-w-56">{active.name}</span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Versions</DropdownMenuLabel>
            {versions.map((version) => (
              <DropdownMenuItem key={version.id} onClick={() => setActiveVersion(version.id)} className="gap-2.5 py-1.5">
                <VersionGlyph design={version.design} />
                <span className="min-w-0 flex-1 truncate">{version.name}</span>
                {version.id === active.id && <CheckIcon className="text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialog("new")}>
            <PlusIcon /> New version…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("rename")}>
            <PencilIcon /> Rename “{active.name}”…
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              update((draft) => void createVersion(draft, { name: `Copy of ${active.name}`.slice(0, 60), sourceId: active.id }));
              toast(`Created “Copy of ${active.name}”`, {
                description: "You're now editing the copy.",
                action: { label: "Rename", onClick: () => setDialog("rename") },
              });
            }}
          >
            <CopyIcon /> Duplicate “{active.name}”
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={versions.length <= 1} onClick={() => setDialog("delete")}>
            <Trash2Icon /> Delete “{active.name}”…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewVersionDialog
        open={dialog === "new"}
        onOpenChange={closeDialog}
        versions={versions}
        defaultSourceId={active.id}
        onCreate={({ name, sourceId }) => update((draft) => void createVersion(draft, { name, sourceId }))}
      />
      <RenameVersionDialog
        open={dialog === "rename"}
        onOpenChange={closeDialog}
        initial={active.name}
        onSubmit={(name) =>
          update((draft) => {
            const version = draft.versions.find((v) => v.id === active.id);
            if (version) version.name = name;
          })
        }
      />
      <DeleteVersionDialog
        open={dialog === "delete"}
        onOpenChange={closeDialog}
        name={active.name}
        onConfirm={() => {
          const name = active.name;
          update((draft) => deleteVersion(draft, active.id));
          toast(`Deleted “${name}”`, { action: { label: "Undo", onClick: undo } });
        }}
      />
    </div>
  );
}
