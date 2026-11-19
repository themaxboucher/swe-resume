import type { Metadata } from "next";
import { Suspense } from "react";
import { CoverLetterEditor } from "@/components/editor/cover-letter-editor";
import { EditorSkeleton } from "@/components/editor/editor-states";

export const metadata: Metadata = { title: "Edit cover letter" };

async function Editor({ params }: { params: PageProps<"/cover-letters/[id]">["params"] }) {
  const { id } = await params;
  return <CoverLetterEditor id={id} />;
}

export default function CoverLetterEditorPage({ params }: PageProps<"/cover-letters/[id]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Editor params={params} />
    </Suspense>
  );
}
