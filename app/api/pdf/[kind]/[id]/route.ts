import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { coverLetter, resume } from "@/lib/db/schema";
import { renderPdf } from "@/lib/pdf";
import { createPrintToken } from "@/lib/print-token";

export const maxDuration = 60;

const paramsSchema = z.object({ kind: z.enum(["resume", "cover-letter"]), id: z.uuid() });

export async function GET(request: Request, ctx: RouteContext<"/api/pdf/[kind]/[id]">) {
  const parsed = paramsSchema.safeParse(await ctx.params);
  if (!parsed.success) return new Response("Not found", { status: 404 });
  const { kind, id } = parsed.data;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const table = kind === "resume" ? resume : coverLetter;
  const [doc] = await db
    .select({ title: table.title })
    .from(table)
    .where(and(eq(table.id, id), eq(table.userId, session.user.id)));
  if (!doc) return new Response("Not found", { status: 404 });

  const origin = process.env.PDF_RENDER_ORIGIN || new URL(request.url).origin;
  const token = createPrintToken(kind, id);

  try {
    const pdf = await renderPdf(`${origin}/print/${kind}/${id}?token=${encodeURIComponent(token)}`);
    const filename = doc.title.replace(/[^\w\- ]+/g, "").trim() || "document";
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"; filename*=UTF-8''${encodeURIComponent(doc.title)}.pdf`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[pdf] render failed", error);
    return new Response("Failed to render PDF", { status: 500 });
  }
}
