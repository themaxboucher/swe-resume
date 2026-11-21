"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { buildVersionBlocks } from "@/components/document/resume-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { defaultFileName, ordered } from "@/lib/documents/versions";
import { useTRPC } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/trpc/router";
import { cn } from "@/lib/utils";
import { DesignPanel } from "./design-panel";
import { isConflict, useAutosave, useOutsideChanges } from "./document-store";
import { EditorShell, PreviewPane } from "./editor-shell";
import { EditorError, EditorSkeleton } from "./editor-states";
import { useEditorHistory } from "./history";
import { ResumeForm } from "./resume-form";
import {
  copyDesignTo,
  createResumeStore,
  getActiveVersion,
  ResumeStoreProvider,
  useActiveVersion,
  useResume,
  useUpdate,
  type ResumeData,
  type ResumeStore,
} from "./resume-store";
import { VersionGlyph } from "./version-controls";
import { VersionPicker } from "./version-picker";

type LoadedResume = inferRouterOutputs<AppRouter>["resume"]["get"];

export function ResumeEditor({ versionId }: { versionId?: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const query = useQuery(
    trpc.resume.get.queryOptions(undefined, { staleTime: Infinity, refetchOnWindowFocus: false, retry: false }),
  );
  // Bumped to start the editor over from the latest save after the resume changed somewhere else.
  const [reload, setReload] = useState({ count: 0, versionId });
  if (query.isPending) return <EditorSkeleton />;
  if (query.isError) return <EditorError notFound={query.error.data?.code === "NOT_FOUND"} />;
  return (
    <LoadedResumeEditor
      key={`${query.data.id}:${reload.count}`}
      initial={query.data}
      versionId={reload.count === 0 ? versionId : reload.versionId}
      onReload={(latest, activeVersionId) => {
        queryClient.setQueryData(trpc.resume.get.queryKey(), latest);
        setReload((r) => ({ count: r.count + 1, versionId: activeVersionId }));
      }}
    />
  );
}

/** Fetches the latest saved resume, bypassing the editor's cache. */
function useFetchLatestResume() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return () => queryClient.fetchQuery({ ...trpc.resume.get.queryOptions(), staleTime: 0 });
}

const saveSlice = ({ content, versions, fileName }: ResumeData) => ({ content, versions, fileName });

function LoadedResumeEditor({
  initial,
  versionId,
  onReload,
}: {
  initial: LoadedResume;
  versionId?: string;
  onReload: (latest: LoadedResume, activeVersionId: string) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const fetchLatest = useFetchLatestResume();
  // The save this editor builds on. Saves send it so the server can refuse to overwrite newer changes.
  const base = useRef(initial.updatedAt);
  const reloading = useRef(false);
  const [store] = useState(() =>
    createResumeStore({
      content: initial.content,
      fileName: initial.fileName,
      versions: initial.versions.map(({ id, name, position, design, layout }) => ({ id, name, position, design, layout })),
      activeVersionId: initial.versions.some((v) => v.id === versionId) ? versionId! : initial.lastVersionId,
    }),
  );
  const save = useMutation(trpc.resume.save.mutationOptions());
  const setLastVersion = useMutation(trpc.resume.setLastVersion.mutationOptions());

  const reloadFrom = (latest: LoadedResume, message: string) => {
    if (reloading.current) return;
    reloading.current = true;
    toast(message);
    onReload(latest, store.getState().activeVersionId);
  };

  const { status, flush } = useAutosave(store, saveSlice, async (next, previous) => {
    if (reloading.current) return;
    const upsertVersions = next.versions.filter((v) => !previous.versions.includes(v));
    const deleteVersionIds = previous.versions.filter((p) => !next.versions.some((v) => v.id === p.id)).map((v) => v.id);
    const contentChanged = next.content !== previous.content;
    let updatedAt: Date;
    try {
      ({ updatedAt } = await save.mutateAsync({
        content: contentChanged ? next.content : undefined,
        fileName: next.fileName !== previous.fileName ? next.fileName : undefined,
        upsertVersions,
        deleteVersionIds,
        baseUpdatedAt: base.current,
      }));
    } catch (error) {
      if (!isConflict(error)) throw error;
      reloadFrom(await fetchLatest(), "Your resume was changed in another tab or app, so it was reloaded. Your last edit wasn't saved.");
      return;
    }
    base.current = updatedAt;
    queryClient.setQueryData(trpc.resume.get.queryKey(), (old) =>
      old
        ? {
            ...old,
            content: next.content,
            fileName: next.fileName,
            updatedAt,
            versions: next.versions.map((v) => ({
              ...v,
              updatedAt: upsertVersions.includes(v)
                ? updatedAt
                : (old.versions.find((o) => o.id === v.id)?.updatedAt ?? updatedAt),
            })),
          }
        : old,
    );
  });

  useOutsideChanges(status, base, fetchLatest, (latest) =>
    reloadFrom(latest, "Your resume was updated in another tab or app."),
  );

  // Keep the URL and "open this version next time" in step with the version being edited.
  const { mutate: rememberVersion } = setLastVersion;
  const { lastVersionId } = initial;
  useEffect(() => {
    const sync = (id: string) => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("v") !== id) {
        url.searchParams.set("v", id);
        window.history.replaceState(null, "", url);
      }
    };
    const opened = store.getState().activeVersionId;
    sync(opened);
    // Opening a version from a link counts as using it.
    if (opened !== lastVersionId) rememberVersion({ id: opened });
    return store.subscribe((state, prev) => {
      if (state.activeVersionId === prev.activeVersionId) return;
      sync(state.activeVersionId);
      rememberVersion({ id: state.activeVersionId });
      queryClient.setQueryData(trpc.resume.get.queryKey(), (old) =>
        old ? { ...old, lastVersionId: state.activeVersionId } : old,
      );
    });
  }, [store, rememberVersion, queryClient, trpc, lastVersionId]);

  return (
    <ResumeStoreProvider store={store}>
      <ResumeShell store={store} saveStatus={status} flush={flush} />
    </ResumeStoreProvider>
  );
}

function ResumeShell({
  store,
  saveStatus,
  flush,
}: {
  store: ResumeStore;
  saveStatus: ReturnType<typeof useAutosave>["status"];
  flush: () => Promise<void>;
}) {
  const active = useActiveVersion();
  const fileName = useResume((s) => s.fileName);
  const name = useResume((s) => s.content.personal.name);

  return (
    <EditorShell
      title={<VersionPicker />}
      saveStatus={saveStatus}
      download={{
        url: `/api/pdf/resume/${active.id}`,
        fileName: fileName.trim() || defaultFileName(name),
        flush,
        settings: <FileNameSettings store={store} />,
      }}
      form={<ResumeForm />}
      designPanel={<ResumeDesignPanel />}
      preview={<ResumePreview />}
    />
  );
}

function ResumePreview() {
  const content = useResume((s) => s.content);
  const { layout, design } = useActiveVersion();
  const blocks = useMemo(() => buildVersionBlocks(content, layout, design), [content, layout, design]);
  return <PreviewPane blocks={blocks} design={design} />;
}

function ResumeDesignPanel() {
  const sections = useResume((s) => s.content.sections);
  const version = useActiveVersion();
  const update = useUpdate();
  const shownSections = useMemo(
    () =>
      ordered(sections, version.layout.sections)
        .filter((x) => x.shown)
        .map((x) => x.item),
    [sections, version.layout.sections],
  );
  return (
    <DesignPanel
      design={version.design}
      updateDesign={(recipe) => update((draft) => recipe(getActiveVersion(draft).design))}
      sections={shownSections}
      header={<DesignHeader />}
    />
  );
}

/** Which version the design applies to, with a way to copy it to the others. */
function DesignHeader() {
  const versions = useResume((s) => s.versions);
  const active = useActiveVersion();
  const update = useUpdate();
  const { undo } = useEditorHistory();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const others = versions.filter((v) => v.id !== active.id);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-panel">
      <VersionGlyph design={active.design} className="h-8 w-6" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">Design for {active.name}</p>
        <p className="text-xs text-muted-foreground">
          {others.length ? "Other versions keep their own design." : "Applies to this version."}
        </p>
      </div>
      {others.length > 0 && (
        <Popover
          open={open}
          onOpenChange={(next) => {
            if (next) setSelected(others.map((v) => v.id));
            setOpen(next);
          }}
        >
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            <CopyIcon /> Copy to…
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 gap-2 p-1.5">
            <p className="px-2 pt-1.5 text-xs font-medium text-muted-foreground">
              Replace these versions&apos; design with {active.name}&apos;s
            </p>
            <ul className="flex max-h-72 flex-col overflow-y-auto">
              {others.map((version) => {
                const checked = selected.includes(version.id);
                return (
                  <li key={version.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() =>
                        setSelected((ids) => (checked ? ids.filter((id) => id !== version.id) : [...ids, version.id]))
                      }
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <VersionGlyph design={version.design} />
                      <span className="min-w-0 flex-1 truncate">{version.name}</span>
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-[4px] ring-1 ring-border",
                          checked && "bg-primary text-primary-foreground ring-primary",
                        )}
                      >
                        {checked && <CheckIcon className="size-3" strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <Button
              size="sm"
              className="m-0.5"
              disabled={selected.length === 0}
              onClick={() => {
                update((draft) => copyDesignTo(draft, selected));
                setOpen(false);
                toast(`Design copied to ${selected.length} ${selected.length === 1 ? "version" : "versions"}`, {
                  action: { label: "Undo", onClick: undo },
                });
              }}
            >
              Copy design
            </Button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

/** The PDF file name every version downloads with. */
function FileNameSettings({ store }: { store: ResumeStore }) {
  const id = useId();
  const fileName = useResume((s) => s.fileName);
  const name = useResume((s) => s.content.personal.name);
  const update = useUpdate();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>File name</Label>
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          value={fileName}
          maxLength={120}
          placeholder={defaultFileName(name)}
          onChange={(e) => update((draft) => void (draft.fileName = e.target.value))}
          onBlur={() => {
            if (store.getState().fileName !== store.getState().fileName.trim())
              update((draft) => void (draft.fileName = draft.fileName.trim()));
          }}
        />
        <span className="text-sm text-muted-foreground">.pdf</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Every version downloads with this name. Version names stay private to you.
      </p>
    </div>
  );
}
