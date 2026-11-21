import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { coverLetter } from "@/lib/db/schema";
import { blankCoverLetterContent, defaultCoverLetterDesign } from "@/lib/documents/defaults";
import { coverLetterContentSchema, designSchema, titleSchema } from "@/lib/documents/schema";
import { createTRPCRouter, protectedProcedure } from "../init";

function normalize<T extends { content: unknown; design: unknown }>(row: T) {
  return {
    ...row,
    content: coverLetterContentSchema.parse(row.content),
    design: designSchema.parse(row.design),
  };
}

const idInput = z.object({ id: z.uuid() });

export const coverLetterRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(coverLetter)
      .where(eq(coverLetter.userId, ctx.user.id))
      .orderBy(desc(coverLetter.updatedAt));
    return rows.map(normalize);
  }),

  get: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select()
      .from(coverLetter)
      .where(and(eq(coverLetter.id, input.id), eq(coverLetter.userId, ctx.user.id)));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return normalize(row);
  }),

  create: protectedProcedure
    .input(z.object({ title: titleSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(coverLetter)
        .values({
          userId: ctx.user.id,
          title: input.title ?? "Untitled cover letter",
          content: blankCoverLetterContent({ name: ctx.user.name, email: ctx.user.email }),
          design: defaultCoverLetterDesign(),
        })
        .returning({ id: coverLetter.id });
      return row;
    }),

  duplicate: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const [source] = await ctx.db
      .select()
      .from(coverLetter)
      .where(and(eq(coverLetter.id, input.id), eq(coverLetter.userId, ctx.user.id)));
    if (!source) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .insert(coverLetter)
      .values({
        userId: ctx.user.id,
        title: `Copy of ${source.title}`.slice(0, 120),
        content: source.content,
        design: source.design,
      })
      .returning({ id: coverLetter.id });
    return row;
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        title: titleSchema.optional(),
        content: coverLetterContentSchema.optional(),
        design: designSchema.optional(),
        /** The `updatedAt` this save builds on. A different saved value means someone else changed it. */
        baseUpdatedAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, baseUpdatedAt, ...changes } = input;
      return ctx.db.transaction(async (tx) => {
        const owned = and(eq(coverLetter.id, id), eq(coverLetter.userId, ctx.user.id));
        const [current] = await tx.select({ updatedAt: coverLetter.updatedAt }).from(coverLetter).where(owned).for("update");
        if (!current) throw new TRPCError({ code: "NOT_FOUND" });
        if (baseUpdatedAt && current.updatedAt.getTime() !== baseUpdatedAt.getTime()) {
          throw new TRPCError({ code: "CONFLICT", message: "The cover letter was changed somewhere else." });
        }
        const [row] = await tx
          .update(coverLetter)
          .set({ ...changes, updatedAt: new Date() })
          .where(owned)
          .returning({ id: coverLetter.id, updatedAt: coverLetter.updatedAt });
        return row;
      });
    }),

  delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(coverLetter)
      .where(and(eq(coverLetter.id, input.id), eq(coverLetter.userId, ctx.user.id)));
    return { id: input.id };
  }),
});
