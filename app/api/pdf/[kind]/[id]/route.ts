import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { coverLetter, resume, resumeVersion } from "@/lib/db/schema";
import { resumeContentSchema } from "@/lib/documents/schema";
import { downloadFileName } from "@/lib/documents/versions";
import { renderPdf } from "@/lib/pdf";
import { createPrintToken } from "@/lib/print-token";

export const maxDuration = 60;

const paramsSchema = z.object({ kind: z.enum(["resume", "cover-letter"]), id: z.uuid() });

/** For resumes, `id` is a version id; every version downloads under the resume's shared file name. */
async function resumeFileName(versionId: string, userId: string) {
  const [row] = await db
    .select({ fileName: resume.fileName, content: resume.content })
    .from(resumeVersion)
    .innerJoin(resume, eq(resume.id, resumeVersion.resumeId))
    .where(and(eq(resumeVersion.id, versionId), eq(resumeVersion.userId, userId)));
  if (!row) return null;
  return downloadFileName(row.fileName, resumeContentSchema.parse(row.content).personal.name);
}

async function coverLetterTitle(id: string, userId: string) {
  const [row] = await db
    .select({ title: coverLetter.title })
    .from(coverLetter)
    .where(and(eq(coverLetter.id, id), eq(coverLetter.userId, userId)));
  return row?.title ?? null;
}

export async function GET(request: Request, ctx: RouteContext<"/api/pdf/[kind]/[id]">) {
  const parsed = paramsSchema.safeParse(await ctx.params);
  if (!parsed.success) return new Response("Not found", { status: 404 });
  const { kind, id } = parsed.data;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const title = kind === "resume" ? await resumeFileName(id, session.user.id) : await coverLetterTitle(id, session.user.id);
  if (title === null) return new Response("Not found", { status: 404 });

  const origin = process.env.PDF_RENDER_ORIGIN || new URL(request.url).origin;
  const token = createPrintToken(kind, id);

  try {
    const pdf = await renderPdf(`${origin}/print/${kind}/${id}?token=${encodeURIComponent(token)}`);
    const filename = title.replace(/[^\w\- ]+/g, "").trim() || "document";
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"; filename*=UTF-8''${encodeURIComponent(title)}.pdf`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[pdf] render failed", error);
    return new Response("Failed to render PDF", { status: 500 });
  }
}
