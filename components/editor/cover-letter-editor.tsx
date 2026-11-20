"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { buildCoverLetterBlocks } from "@/components/document/cover-letter-blocks";
import type { CoverLetterContent, DocumentDesign } from "@/lib/documents/schema";
import { useTRPC } from "@/lib/trpc/client";
import { CoverLetterForm } from "./cover-letter-form";
import { DesignPanel } from "./design-panel";
import {
  createDocumentStore,
  DocumentStoreProvider,
  useAutosave,
  useDocument,
  type DocumentState,
  type SaveStatus,
} from "./document-store";
import { EditorShell, PreviewPane, TitleInput } from "./editor-shell";
import { EditorError, EditorSkeleton } from "./editor-states";

type Doc = CoverLetterContent;

export function CoverLetterEditor({ id }: { id: string }) {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.coverLetter.get.queryOptions({ id }, { staleTime: Infinity, refetchOnWindowFocus: false, retry: false }),
  );
  if (query.isPending) return <EditorSkeleton />;
  if (query.isError) return <EditorError notFound={query.error.data?.code === "NOT_FOUND" || query.error.data?.code === "BAD_REQUEST"} />;
  return <LoadedCoverLetterEditor key={id} id={id} initial={query.data} />;
}

function LoadedCoverLetterEditor({ id, initial }: { id: string; initial: DocumentState<CoverLetterContent> }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
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
      await update.mutateAsync({ id, title: title.trim() || "Untitled", content, design });
      queryClient.setQueryData(trpc.coverLetter.get.queryKey({ id }), (old) =>
        old ? { ...old, title, content, design, updatedAt: new Date() } : old,
      );
      void queryClient.invalidateQueries({ queryKey: trpc.coverLetter.list.queryKey() });
    },
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
