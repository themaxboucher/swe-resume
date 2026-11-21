import { TRPCError } from "@trpc/server";
import { and, eq, inArray, max } from "drizzle-orm";
import { z } from "zod";
import { resume, resumeVersion } from "@/lib/db/schema";
import { resumeContentSchema } from "@/lib/documents/schema";
import { versionNameSchema, versionSchema } from "@/lib/documents/versions";
import { loadResume, MAX_VERSIONS, touchResume, type Db } from "@/server/documents/resume-store";
import { createTRPCRouter, protectedProcedure } from "../init";

async function ownVersion(db: Db, userId: string, id: string) {
  const [row] = await db
    .select()
    .from(resumeVersion)
    .where(and(eq(resumeVersion.id, id), eq(resumeVersion.userId, userId)));
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row;
}

async function nextPosition(db: Db, resumeId: string) {
  const [{ value }] = await db
    .select({ value: max(resumeVersion.position) })
    .from(resumeVersion)
    .where(eq(resumeVersion.resumeId, resumeId));
  return (value ?? -1) + 1;
}

async function insertCopy(db: Db, userId: string, sourceId: string, name: string) {
  const source = await ownVersion(db, userId, sourceId);
  const count = await db.$count(resumeVersion, eq(resumeVersion.resumeId, source.resumeId));
  if (count >= MAX_VERSIONS) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `You can have up to ${MAX_VERSIONS} versions.` });
  }
  const [row] = await db
    .insert(resumeVersion)
    .values({
      resumeId: source.resumeId,
      userId,
      name,
      position: await nextPosition(db, source.resumeId),
      design: source.design,
      layout: source.layout,
    })
    .returning({ id: resumeVersion.id });
  await touchResume(db, source.resumeId);
  return row;
}

const idInput = z.object({ id: z.uuid() });

export const resumeRouter = createTRPCRouter({
  get: protectedProcedure.query(({ ctx }) => loadResume(ctx.db, ctx.user)),

  /** Editor autosave: shared content plus whichever versions changed since the last save. */
  save: protectedProcedure
    .input(
      z.object({
        content: resumeContentSchema.optional(),
        fileName: z.string().trim().max(120).optional(),
        upsertVersions: z.array(versionSchema).max(MAX_VERSIONS).default([]),
        deleteVersionIds: z.array(z.uuid()).max(MAX_VERSIONS).default([]),
        /** The resume's `updatedAt` this save builds on. A different saved value means someone else changed it. */
        baseUpdatedAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .select({ id: resume.id, updatedAt: resume.updatedAt })
          .from(resume)
          .where(eq(resume.userId, userId))
          .for("update");
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        if (input.baseUpdatedAt && row.updatedAt.getTime() !== input.baseUpdatedAt.getTime()) {
          throw new TRPCError({ code: "CONFLICT", message: "The resume was changed somewhere else." });
        }
        const now = new Date();

        await tx
          .update(resume)
          .set({
            ...(input.content !== undefined && { content: input.content }),
            ...(input.fileName !== undefined && { fileName: input.fileName }),
            updatedAt: now,
          })
          .where(eq(resume.id, row.id));

        const ids = input.upsertVersions.map((v) => v.id);
        const existing = ids.length
          ? await tx
              .select({ id: resumeVersion.id, userId: resumeVersion.userId })
              .from(resumeVersion)
              .where(inArray(resumeVersion.id, ids))
          : [];
        if (existing.some((v) => v.userId !== userId)) throw new TRPCError({ code: "FORBIDDEN" });
        const existingIds = new Set(existing.map((v) => v.id));

        for (const version of input.upsertVersions) {
          const values = {
            name: version.name,
            position: version.position,
            design: version.design,
            layout: version.layout,
            updatedAt: now,
          };
          if (existingIds.has(version.id)) {
            await tx.update(resumeVersion).set(values).where(eq(resumeVersion.id, version.id));
          } else {
            await tx.insert(resumeVersion).values({ ...values, id: version.id, resumeId: row.id, userId });
          }
        }

        if (input.deleteVersionIds.length) {
          await tx
            .delete(resumeVersion)
            .where(and(inArray(resumeVersion.id, input.deleteVersionIds), eq(resumeVersion.userId, userId)));
        }

        const count = await tx.$count(resumeVersion, eq(resumeVersion.resumeId, row.id));
        if (count === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "A resume needs at least one version." });
        if (count > MAX_VERSIONS) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `You can have up to ${MAX_VERSIONS} versions.` });
        }
        return { updatedAt: now };
      });
    }),

  /** Remembers which version the editor should open next time. */
  setLastVersion: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    await ctx.db.update(resume).set({ lastVersionId: input.id }).where(eq(resume.userId, ctx.user.id));
    return { id: input.id };
  }),

  createVersion: protectedProcedure
    .input(z.object({ name: versionNameSchema, sourceId: z.uuid() }))
    .mutation(({ ctx, input }) => insertCopy(ctx.db, ctx.user.id, input.sourceId, input.name)),

  duplicateVersion: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const source = await ownVersion(ctx.db, ctx.user.id, input.id);
    return insertCopy(ctx.db, ctx.user.id, source.id, `Copy of ${source.name}`.slice(0, 60));
  }),

  renameVersion: protectedProcedure
    .input(z.object({ id: z.uuid(), name: versionNameSchema }))
    .mutation(async ({ ctx, input }) => {
      const version = await ownVersion(ctx.db, ctx.user.id, input.id);
      await ctx.db
        .update(resumeVersion)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(resumeVersion.id, input.id));
      await touchResume(ctx.db, version.resumeId);
      return { id: input.id };
    }),

  deleteVersion: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const version = await ownVersion(ctx.db, ctx.user.id, input.id);
    const count = await ctx.db.$count(resumeVersion, eq(resumeVersion.resumeId, version.resumeId));
    if (count <= 1) throw new TRPCError({ code: "BAD_REQUEST", message: "A resume needs at least one version." });
    await ctx.db.delete(resumeVersion).where(eq(resumeVersion.id, input.id));
    await touchResume(ctx.db, version.resumeId);
    return { id: input.id };
  }),
});
