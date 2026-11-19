import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { resume } from "@/lib/db/schema";
import { blankResumeContent, defaultDesign } from "@/lib/documents/defaults";
import { designSchema, resumeContentSchema, titleSchema } from "@/lib/documents/schema";
import { createTRPCRouter, protectedProcedure } from "../init";

function normalize<T extends { content: unknown; design: unknown }>(row: T) {
  return {
    ...row,
    content: resumeContentSchema.parse(row.content),
    design: designSchema.parse(row.design),
  };
}

const idInput = z.object({ id: z.uuid() });

export const resumeRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(resume)
      .where(eq(resume.userId, ctx.user.id))
      .orderBy(desc(resume.updatedAt));
    return rows.map(normalize);
  }),

  get: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select()
      .from(resume)
      .where(and(eq(resume.id, input.id), eq(resume.userId, ctx.user.id)));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return normalize(row);
  }),

  create: protectedProcedure
    .input(z.object({ title: titleSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(resume)
        .values({
          userId: ctx.user.id,
          title: input.title ?? "Untitled resume",
          content: blankResumeContent({ name: ctx.user.name, email: ctx.user.email }),
          design: defaultDesign(),
        })
        .returning({ id: resume.id });
      return row;
    }),

  duplicate: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const [source] = await ctx.db
      .select()
      .from(resume)
      .where(and(eq(resume.id, input.id), eq(resume.userId, ctx.user.id)));
    if (!source) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .insert(resume)
      .values({
        userId: ctx.user.id,
        title: `Copy of ${source.title}`.slice(0, 120),
        content: source.content,
        design: source.design,
      })
      .returning({ id: resume.id });
    return row;
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        title: titleSchema.optional(),
        content: resumeContentSchema.optional(),
        design: designSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...changes } = input;
      const [row] = await ctx.db
        .update(resume)
        .set({ ...changes, updatedAt: new Date() })
        .where(and(eq(resume.id, id), eq(resume.userId, ctx.user.id)))
        .returning({ id: resume.id, updatedAt: resume.updatedAt });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(resume).where(and(eq(resume.id, input.id), eq(resume.userId, ctx.user.id)));
    return { id: input.id };
  }),
});
