import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import { z } from "zod";
import type { db as database } from "@/lib/db";
import { resume, resumeVersion } from "@/lib/db/schema";
import { blankResumeContent, defaultDesign } from "@/lib/documents/defaults";
import { designSchema, resumeContentSchema } from "@/lib/documents/schema";
import {
  DEFAULT_VERSION_NAME,
  fullLayout,
  reconcileLayout,
  versionLayoutSchema,
  versionNameSchema,
  versionSchema,
} from "@/lib/documents/versions";
import { createTRPCRouter, protectedProcedure } from "../init";

type Db = typeof database;
type User = { id: string; name: string; email: string };

const MAX_VERSIONS = 50;

/** Returns the user's resume, creating it (with a first version) on first use. */
async function ensureResume(db: Db, user: User) {
  const [existing] = await db.select().from(resume).where(eq(resume.userId, user.id));
  if (existing) return existing;
  await db.transaction(async (tx) => {
    const content = blankResumeContent({ name: user.name, email: user.email });
    const [created] = await tx
      .insert(resume)
      .values({ userId: user.id, content })
      .onConflictDoNothing({ target: resume.userId })
      .returning({ id: resume.id });
    if (!created) return; // Created concurrently by another request.
    const [version] = await tx
      .insert(resumeVersion)
      .values({
        resumeId: created.id,
        userId: user.id,
        name: DEFAULT_VERSION_NAME,
        position: 0,
        design: defaultDesign(),
        layout: fullLayout(content),
      })
      .returning({ id: resumeVersion.id });
    await tx.update(resume).set({ lastVersionId: version.id }).where(eq(resume.id, created.id));
  });
  const [row] = await db.select().from(resume).where(eq(resume.userId, user.id));
  return row;
}

async function loadResume(db: Db, user: User) {
  const row = await ensureResume(db, user);
  const content = resumeContentSchema.parse(row.content);
  let rows = await db
    .select()
    .from(resumeVersion)
    .where(eq(resumeVersion.resumeId, row.id))
    .orderBy(asc(resumeVersion.position), asc(resumeVersion.createdAt));
  if (rows.length === 0) {
    rows = await db
      .insert(resumeVersion)
      .values({
        resumeId: row.id,
        userId: user.id,
        name: DEFAULT_VERSION_NAME,
        design: defaultDesign(),
        layout: fullLayout(content),
      })
      .returning();
  }
  const versions = rows.map((v) => ({
    id: v.id,
    name: v.name,
    position: v.position,
    design: designSchema.parse(v.design),
    layout: reconcileLayout(content, versionLayoutSchema.parse(v.layout)),
    updatedAt: v.updatedAt,
  }));
  return {
    id: row.id,
    content,
    fileName: row.fileName,
    lastVersionId: versions.some((v) => v.id === row.lastVersionId) ? row.lastVersionId! : versions[0].id,
    updatedAt: row.updatedAt,
    versions,
  };
}

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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx.select({ id: resume.id }).from(resume).where(eq(resume.userId, userId));
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        const now = new Date();

        if (input.content !== undefined || input.fileName !== undefined) {
          await tx
            .update(resume)
            .set({
              ...(input.content !== undefined && { content: input.content }),
              ...(input.fileName !== undefined && { fileName: input.fileName }),
              updatedAt: now,
            })
            .where(eq(resume.id, row.id));
        }

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
      await ownVersion(ctx.db, ctx.user.id, input.id);
      await ctx.db
        .update(resumeVersion)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(resumeVersion.id, input.id));
      return { id: input.id };
    }),

  deleteVersion: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const version = await ownVersion(ctx.db, ctx.user.id, input.id);
    const count = await ctx.db.$count(resumeVersion, eq(resumeVersion.resumeId, version.resumeId));
    if (count <= 1) throw new TRPCError({ code: "BAD_REQUEST", message: "A resume needs at least one version." });
    await ctx.db.delete(resumeVersion).where(eq(resumeVersion.id, input.id));
    return { id: input.id };
  }),
});
