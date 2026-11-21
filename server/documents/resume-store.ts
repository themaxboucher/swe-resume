import "server-only";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { produce } from "immer";
import type { db as database } from "@/lib/db";
import { resume, resumeVersion } from "@/lib/db/schema";
import { blankResumeContent, defaultDesign } from "@/lib/documents/defaults";
import type { ResumeDraft } from "@/lib/documents/resume-edits";
import { designSchema, resumeContentSchema } from "@/lib/documents/schema";
import {
  DEFAULT_VERSION_NAME,
  fullLayout,
  reconcileLayout,
  versionLayoutSchema,
  versionSchema,
  type ResumeVersion,
} from "@/lib/documents/versions";

export type Db = typeof database;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type ResumeUser = { id: string; name: string; email: string };

export const MAX_VERSIONS = 50;

/** Returns the user's resume, creating it (with a first version) on first use. */
export async function ensureResume(db: Db, user: ResumeUser) {
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

async function versionRows(db: Db | Tx, resumeId: string) {
  return db
    .select()
    .from(resumeVersion)
    .where(eq(resumeVersion.resumeId, resumeId))
    .orderBy(asc(resumeVersion.position), asc(resumeVersion.createdAt));
}

function parseVersions(content: ReturnType<typeof resumeContentSchema.parse>, rows: Awaited<ReturnType<typeof versionRows>>) {
  return rows.map((v) => ({
    id: v.id,
    name: v.name,
    position: v.position,
    design: designSchema.parse(v.design),
    layout: reconcileLayout(content, versionLayoutSchema.parse(v.layout)),
    updatedAt: v.updatedAt,
  }));
}

/** The user's resume: shared content plus every version, each layout reconciled with the content. */
export async function loadResume(db: Db, user: ResumeUser) {
  const row = await ensureResume(db, user);
  const content = resumeContentSchema.parse(row.content);
  let rows = await versionRows(db, row.id);
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
  const versions = parseVersions(content, rows);
  return {
    id: row.id,
    content,
    fileName: row.fileName,
    lastVersionId: versions.some((v) => v.id === row.lastVersionId) ? row.lastVersionId! : versions[0].id,
    /** Changes whenever anything in the resume or its versions is saved; the editor uses it to spot outside edits. */
    updatedAt: row.updatedAt,
    versions,
  };
}

export type LoadedResume = Awaited<ReturnType<typeof loadResume>>;

/**
 * Applies `edit` to the latest saved resume and saves what it changed. The resume row stays locked for the
 * whole read-modify-write, so concurrent edits (two tool calls, or a tool call and the editor) never
 * overwrite each other. `edit` runs inside an immer recipe; throw to cancel without saving.
 */
export async function editResume<T>(
  db: Db,
  user: ResumeUser,
  activeVersionId: string | null,
  edit: (draft: ResumeDraft) => T,
): Promise<{ result: T; resume: LoadedResume }> {
  await ensureResume(db, user);
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(resume).where(eq(resume.userId, user.id)).for("update");
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    const content = resumeContentSchema.parse(row.content);
    const versions: ResumeVersion[] = parseVersions(content, await versionRows(tx, row.id)).map(
      ({ id, name, position, design, layout }) => ({ id, name, position, design, layout }),
    );
    if (activeVersionId !== null && !versions.some((v) => v.id === activeVersionId)) {
      throw new TRPCError({ code: "NOT_FOUND", message: `No version with id ${activeVersionId}.` });
    }

    let value!: T;
    const before: ResumeDraft = { content, versions, activeVersionId: activeVersionId ?? versions[0].id };
    const after = produce(before, (draft) => {
      value = edit(draft);
    });

    const nextContent = resumeContentSchema.parse(after.content);
    const changedVersions = after.versions.filter((v) => !before.versions.includes(v)).map((v) => versionSchema.parse(v));
    if (after.versions.length > MAX_VERSIONS) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `A resume can have up to ${MAX_VERSIONS} versions.` });
    }
    if (after.content === before.content && changedVersions.length === 0) return value;

    const now = new Date();
    await tx
      .update(resume)
      .set({ ...(after.content !== before.content && { content: nextContent }), updatedAt: now })
      .where(eq(resume.id, row.id));
    const existingIds = new Set(before.versions.map((v) => v.id));
    for (const version of changedVersions) {
      const values = { name: version.name, position: version.position, design: version.design, layout: version.layout, updatedAt: now };
      if (existingIds.has(version.id)) {
        await tx.update(resumeVersion).set(values).where(eq(resumeVersion.id, version.id));
      } else {
        await tx.insert(resumeVersion).values({ ...values, id: version.id, resumeId: row.id, userId: user.id });
      }
    }
    return value;
  });
  return { result, resume: await loadResume(db, user) };
}

/** Marks the resume as changed, so an open editor notices edits made through other routes. */
export async function touchResume(db: Db | Tx, resumeId: string) {
  await db.update(resume).set({ updatedAt: new Date() }).where(eq(resume.id, resumeId));
}
