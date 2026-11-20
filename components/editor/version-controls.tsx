"use client";

import { CheckIcon, EyeIcon, EyeOffIcon, LayersIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DocumentDesign } from "@/lib/documents/schema";
import { isShown, type ItemScope } from "@/lib/documents/versions";
import { cn } from "@/lib/utils";
import { getActiveVersion, setShownIn, useResume, useUpdate } from "./resume-store";

/** A tiny page sketch of a version's design: accent, alignment and columns. */
export function VersionGlyph({ design, className }: { design: DocumentDesign; className?: string }) {
  const line = "h-[2px] rounded-full bg-neutral-300";
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-6 w-[18px] shrink-0 flex-col gap-[3px] rounded-[3px] bg-white p-[3px] ring-1 ring-black/10",
        className,
      )}
    >
      <span
        className={cn("h-[3px] w-2/3 rounded-full", design.headerAlign === "center" && "self-center")}
        style={{ background: design.accentColor }}
      />
      <span className={cn("flex flex-1 gap-[2px]", design.sidebarSide === "left" && "flex-row-reverse")}>
        <span className="flex flex-1 flex-col gap-[2px]">
          <span className={line} />
          <span className={line} />
          <span className={cn(line, "w-3/4")} />
        </span>
        {design.columns === 2 && (
          <span className="flex w-[35%] flex-col gap-[2px]">
            <span className={line} />
            <span className={line} />
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * Eye toggle for the version being edited, plus a "2/4" chip that lists every version with a checkbox.
 * The chip only appears once there is more than one version.
 */
export function VisibilityControls({
  scope,
  itemId,
  label,
  compact = false,
}: {
  scope: ItemScope;
  itemId: string;
  /** What the item is called, for screen readers and the popover title. */
  label: string;
  /** Smaller buttons, for dense rows like contacts. */
  compact?: boolean;
}) {
  const versions = useResume((s) => s.versions);
  const activeVersionId = useResume((s) => s.activeVersionId);
  const update = useUpdate();
  const active = getActiveVersion({ versions, activeVersionId });
  const shownHere = isShown(active.layout, scope, itemId);
  const shownIn = versions.filter((v) => isShown(v.layout, scope, itemId));

  const set = (versionIds: string[], shown: boolean) =>
    update((draft) => {
      for (const id of versionIds) setShownIn(draft, id, scope, itemId, shown);
    });

  const size = compact ? "size-5 [&_svg]:size-3.5" : "size-8 [&_svg]:size-4";
  const eyeLabel = `${shownHere ? "Hide" : "Show"} ${label} in ${active.name}`;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={eyeLabel}
              aria-pressed={shownHere}
              onClick={() => set([active.id], !shownHere)}
              className={cn(
                "flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                size,
                !shownHere && "text-muted-foreground/70",
              )}
            />
          }
        >
          {shownHere ? <EyeIcon /> : <EyeOffIcon />}
        </TooltipTrigger>
        <TooltipContent>{shownHere ? `Shown in ${active.name}` : `Hidden in ${active.name}`}</TooltipContent>
      </Tooltip>

      {versions.length > 1 && (
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label={`${label}: shown in ${shownIn.length} of ${versions.length} versions. Choose versions`}
                title={`Shown in ${shownIn.length} of ${versions.length} versions`}
                className={cn(
                  "flex items-center gap-1 rounded-full border border-border bg-card px-1.5 font-medium text-muted-foreground tabular-nums transition-colors hover:border-foreground/25 hover:text-foreground aria-expanded:border-primary aria-expanded:text-primary",
                  compact ? "h-5 text-[10.5px] [&_svg]:size-3" : "h-6 text-[11px] [&_svg]:size-3.5",
                  shownIn.length === versions.length && "text-foreground",
                )}
              />
            }
          >
            <LayersIcon />
            {shownIn.length}/{versions.length}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 gap-2 p-1.5">
            <p className="truncate px-2 pt-1.5 text-xs font-medium text-muted-foreground">Show “{label}” in</p>
            <ul className="flex max-h-72 flex-col overflow-y-auto">
              {versions.map((version) => {
                const shown = shownIn.includes(version);
                return (
                  <li key={version.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={shown}
                      onClick={() => set([version.id], !shown)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <VersionGlyph design={version.design} />
                      <span className="min-w-0 flex-1 truncate">
                        {version.name}
                        {version.id === active.id && <span className="ml-1.5 text-xs text-muted-foreground">editing</span>}
                      </span>
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-[4px] ring-1 ring-border transition-colors",
                          shown && "bg-primary text-primary-foreground ring-primary",
                        )}
                      >
                        {shown && <CheckIcon className="size-3" strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-1 border-t border-border px-0.5 pt-1.5">
              <button
                type="button"
                onClick={() => set(versions.map((v) => v.id), true)}
                className="h-7 flex-1 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                All versions
              </button>
              <button
                type="button"
                onClick={() =>
                  update((draft) => {
                    for (const v of draft.versions) setShownIn(draft, v.id, scope, itemId, v.id === active.id);
                  })
                }
                className="h-7 min-w-0 flex-1 truncate rounded-md px-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Only {active.name}
              </button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
