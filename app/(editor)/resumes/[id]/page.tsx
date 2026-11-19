import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorSkeleton } from "@/components/editor/editor-states";
import { ResumeEditor } from "@/components/editor/resume-editor";

export const metadata: Metadata = { title: "Edit resume" };

async function Editor({ params }: { params: PageProps<"/resumes/[id]">["params"] }) {
  const { id } = await params;
  return <ResumeEditor id={id} />;
}

export default function ResumeEditorPage({ params }: PageProps<"/resumes/[id]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Editor params={params} />
    </Suspense>
  );
}
