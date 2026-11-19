"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { buildCoverLetterBlocks } from "@/components/document/cover-letter-blocks";
import type { CoverLetterContent } from "@/lib/documents/schema";
import { useTRPC } from "@/lib/trpc/client";
import { CoverLetterForm } from "./cover-letter-form";
import { DesignPanel } from "./design-panel";
import { createDocumentStore, DocumentStoreProvider, useAutosave, type DocumentState } from "./document-store";
import { EditorShell } from "./editor-shell";
import { EditorError, EditorSkeleton } from "./editor-states";

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

  const { status, flush } = useAutosave(store, async ({ title, content, design }) => {
    await update.mutateAsync({ id, title: title.trim() || "Untitled", content, design });
    queryClient.setQueryData(trpc.coverLetter.get.queryKey({ id }), (old) =>
      old ? { ...old, title, content, design, updatedAt: new Date() } : old,
    );
    void queryClient.invalidateQueries({ queryKey: trpc.coverLetter.list.queryKey() });
  });

  return (
    <DocumentStoreProvider store={store}>
      <EditorShell<CoverLetterContent>
        kind="cover-letter"
        id={id}
        saveStatus={status}
        flush={flush}
        form={<CoverLetterForm />}
        designPanel={<DesignPanel />}
        buildBlocks={buildCoverLetterBlocks}
      />
    </DocumentStoreProvider>
  );
}
