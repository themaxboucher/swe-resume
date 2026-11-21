"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { buildCoverLetterBlocks } from "@/components/document/cover-letter-blocks";
import type { CoverLetterContent, DocumentDesign } from "@/lib/documents/schema";
import { useTRPC } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/trpc/router";
import { CoverLetterForm } from "./cover-letter-form";
import { DesignPanel } from "./design-panel";
import {
  createDocumentStore,
  DocumentStoreProvider,
  isConflict,
  useAutosave,
  useDocument,
  useOutsideChanges,
  type SaveStatus,
} from "./document-store";
import { EditorShell, PreviewPane, TitleInput } from "./editor-shell";
import { EditorError, EditorSkeleton } from "./editor-states";

type Doc = CoverLetterContent;

type LoadedCoverLetter = inferRouterOutputs<AppRouter>["coverLetter"]["get"];

export function CoverLetterEditor({ id }: { id: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const query = useQuery(
    trpc.coverLetter.get.queryOptions({ id }, { staleTime: Infinity, refetchOnWindowFocus: false, retry: false }),
  );
  // Bumped to start the editor over from the latest save after the letter changed somewhere else.
  const [reloads, setReloads] = useState(0);
  if (query.isPending) return <EditorSkeleton />;
  if (query.isError) return <EditorError notFound={query.error.data?.code === "NOT_FOUND" || query.error.data?.code === "BAD_REQUEST"} />;
  return (
    <LoadedCoverLetterEditor
      key={`${id}:${reloads}`}
      id={id}
      initial={query.data}
      onReload={(latest) => {
        queryClient.setQueryData(trpc.coverLetter.get.queryKey({ id }), latest);
        setReloads((n) => n + 1);
      }}
    />
  );
}

function LoadedCoverLetterEditor({
  id,
  initial,
  onReload,
}: {
  id: string;
  initial: LoadedCoverLetter;
  onReload: (latest: LoadedCoverLetter) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const fetchLatest = () => queryClient.fetchQuery({ ...trpc.coverLetter.get.queryOptions({ id }), staleTime: 0 });
  // The save this editor builds on. Saves send it so the server can refuse to overwrite newer changes.
  const base = useRef(initial.updatedAt);
  const reloading = useRef(false);
  const reloadFrom = (latest: LoadedCoverLetter, message: string) => {
    if (reloading.current) return;
    reloading.current = true;
    toast(message);
    onReload(latest);
  };
  const [store] = useState(() =>
    createDocumentStore<CoverLetterContent>({
      title: initial.title,
      content: initial.content,
      design: initial.design,
    }),
  );
  const update = useMutation(trpc.coverLetter.update.mutationOptions());

  const { status, flush } = useAutosave(
    store,
    ({ title, content, design }) => ({ title, content, design }),
    async ({ title, content, design }) => {
      if (reloading.current) return;
      let updatedAt: Date;
      try {
        ({ updatedAt } = await update.mutateAsync({
          id,
          title: title.trim() || "Untitled",
          content,
          design,
          baseUpdatedAt: base.current,
        }));
      } catch (error) {
        if (!isConflict(error)) throw error;
        reloadFrom(
          await fetchLatest(),
          "This cover letter was changed in another tab or app, so it was reloaded. Your last edit wasn't saved.",
        );
        return;
      }
      base.current = updatedAt;
      queryClient.setQueryData(trpc.coverLetter.get.queryKey({ id }), (old) =>
        old ? { ...old, title, content, design, updatedAt } : old,
      );
      void queryClient.invalidateQueries({ queryKey: trpc.coverLetter.list.queryKey() });
    },
  );

  useOutsideChanges(status, base, fetchLatest, (latest) =>
    reloadFrom(latest, "This cover letter was updated in another tab or app."),
  );

  return (
    <DocumentStoreProvider store={store}>
      <CoverLetterShell id={id} saveStatus={status} flush={flush} />
    </DocumentStoreProvider>
  );
}

function CoverLetterShell({ id, saveStatus, flush }: { id: string; saveStatus: SaveStatus; flush: () => Promise<void> }) {
  const title = useDocument<Doc, string>((s) => s.title);
  const setTitle = useDocument<Doc, (title: string) => void>((s) => s.setTitle);
  const content = useDocument<Doc, Doc>((s) => s.content);
  const design = useDocument<Doc, DocumentDesign>((s) => s.design);
  const updateDesign = useDocument<Doc, (recipe: (d: DocumentDesign) => void) => void>((s) => s.updateDesign);
  const blocks = useMemo(() => buildCoverLetterBlocks(content, design), [content, design]);

  return (
    <EditorShell
      title={<TitleInput value={title} onChange={setTitle} />}
      saveStatus={saveStatus}
      download={{ url: `/api/pdf/cover-letter/${id}`, fileName: title, flush }}
      form={<CoverLetterForm />}
      designPanel={<DesignPanel design={design} updateDesign={updateDesign} />}
      preview={<PreviewPane blocks={blocks} design={design} />}
    />
  );
}
