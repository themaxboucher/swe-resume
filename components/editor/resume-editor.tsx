"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { buildResumeBlocks } from "@/components/document/resume-blocks";
import type { ResumeContent, Section } from "@/lib/documents/schema";
import { useTRPC } from "@/lib/trpc/client";
import { DesignPanel } from "./design-panel";
import { createDocumentStore, DocumentStoreProvider, useAutosave, useDocument, type DocumentState } from "./document-store";
import { EditorShell } from "./editor-shell";
import { EditorError, EditorSkeleton } from "./editor-states";
import { ResumeForm } from "./resume-form";

export function ResumeEditor({ id }: { id: string }) {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.resume.get.queryOptions({ id }, { staleTime: Infinity, refetchOnWindowFocus: false, retry: false }),
  );
  if (query.isPending) return <EditorSkeleton />;
  if (query.isError) return <EditorError notFound={query.error.data?.code === "NOT_FOUND" || query.error.data?.code === "BAD_REQUEST"} />;
  return <LoadedResumeEditor key={id} id={id} initial={query.data} />;
}

function LoadedResumeEditor({ id, initial }: { id: string; initial: DocumentState<ResumeContent> }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [store] = useState(() =>
    createDocumentStore<ResumeContent>({ title: initial.title, content: initial.content, design: initial.design }),
  );
  const update = useMutation(trpc.resume.update.mutationOptions());

  const { status, flush } = useAutosave(store, async ({ title, content, design }) => {
    await update.mutateAsync({ id, title: title.trim() || "Untitled", content, design });
    queryClient.setQueryData(trpc.resume.get.queryKey({ id }), (old) =>
      old ? { ...old, title, content, design, updatedAt: new Date() } : old,
    );
    void queryClient.invalidateQueries({ queryKey: trpc.resume.list.queryKey() });
  });

  return (
    <DocumentStoreProvider store={store}>
      <EditorShell<ResumeContent>
        kind="resume"
        id={id}
        saveStatus={status}
        flush={flush}
        form={<ResumeForm />}
        designPanel={<ResumeDesignPanel />}
        buildBlocks={buildResumeBlocks}
      />
    </DocumentStoreProvider>
  );
}

function ResumeDesignPanel() {
  const sections = useDocument<ResumeContent, Section[]>((s) => s.content.sections);
  return <DesignPanel sections={sections} />;
}
