import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorSkeleton } from "@/components/editor/editor-states";
import { ResumeEditor } from "@/components/editor/resume-editor";

export const metadata: Metadata = { title: "Edit resume" };

async function Editor({ searchParams }: { searchParams: PageProps<"/resume">["searchParams"] }) {
  const { v } = await searchParams;
  return <ResumeEditor versionId={typeof v === "string" ? v : undefined} />;
}

export default function ResumeEditorPage({ searchParams }: PageProps<"/resume">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Editor searchParams={searchParams} />
    </Suspense>
  );
}
