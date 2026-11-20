import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrintView } from "@/components/document/print-view";
import { db } from "@/lib/db";
import { coverLetter, resume, resumeVersion } from "@/lib/db/schema";
import { coverLetterContentSchema, designSchema, resumeContentSchema } from "@/lib/documents/schema";
import { reconcileLayout, versionLayoutSchema } from "@/lib/documents/versions";
import { verifyPrintToken, type PrintKind } from "@/lib/print-token";

export const metadata: Metadata = { title: "Print", robots: { index: false, follow: false } };

async function PrintDocument({ params, searchParams }: PageProps<"/print/[kind]/[id]">) {
  const { kind, id } = await params;
  const { token } = await searchParams;
  if (kind !== "resume" && kind !== "cover-letter") notFound();
  if (!verifyPrintToken(kind as PrintKind, id, typeof token === "string" ? token : undefined)) notFound();

  // Resumes print one version: `id` is the version's id.
  if (kind === "resume") {
    const [row] = await db
      .select({ content: resume.content, design: resumeVersion.design, layout: resumeVersion.layout })
      .from(resumeVersion)
      .innerJoin(resume, eq(resume.id, resumeVersion.resumeId))
      .where(eq(resumeVersion.id, id));
    if (!row) notFound();
    const content = resumeContentSchema.parse(row.content);
    return (
      <PrintView
        kind="resume"
        content={content}
        design={designSchema.parse(row.design)}
        layout={reconcileLayout(content, versionLayoutSchema.parse(row.layout))}
      />
    );
  }
  const [row] = await db.select().from(coverLetter).where(eq(coverLetter.id, id));
  if (!row) notFound();
  return (
    <PrintView
      kind="cover-letter"
      content={coverLetterContentSchema.parse(row.content)}
      design={designSchema.parse(row.design)}
    />
  );
}

export default function PrintPage(props: PageProps<"/print/[kind]/[id]">) {
  return (
    <Suspense>
      <PrintDocument {...props} />
    </Suspense>
  );
}
