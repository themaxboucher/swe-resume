import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z, ZodError } from "zod";
import { db } from "@/lib/db";
import { coverLetter } from "@/lib/db/schema";
import { newContact } from "@/lib/documents/contacts";
import { blankCoverLetterContent, defaultCoverLetterDesign, newSection } from "@/lib/documents/defaults";
import { markdownToRichText, richTextToMarkdown, richTextToPlain } from "@/lib/documents/markdown";
import {
  addContact,
  addEntry,
  addSection,
  copyDesignTo,
  createVersion,
  duplicateContact,
  duplicateEntry,
  duplicateSection,
  findSection,
  orderedIds,
  setShownIn,
  type ResumeDraft,
} from "@/lib/documents/resume-edits";
import {
  CONTACT_TYPES,
  coverLetterContentSchema,
  designObjectSchema,
  designSchema,
  LIST_SECTION_TYPES,
  type ContactField,
  type Entry,
  type ResumeContent,
} from "@/lib/documents/schema";
import { emptyEntry, SECTION_CONFIG } from "@/lib/documents/sections";
import {
  isShown,
  layoutList,
  ordered,
  versionNameSchema,
  type ItemScope,
  type ResumeVersion,
} from "@/lib/documents/versions";
import { appUrl } from "@/lib/mcp-config";
import { editResume, loadResume, type LoadedResume, type ResumeUser } from "@/server/documents/resume-store";

// ---------- Results ----------

/** A failure the model can act on, reported as a tool error rather than a protocol error. */
class ToolError extends Error {}

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

function ok(summary: string, data?: unknown): ToolResult {
  const text = data === undefined ? summary : `${summary}\n\n${JSON.stringify(data, null, 2)}`;
  return { content: [{ type: "text", text }] };
}

function errorMessage(error: unknown) {
  if (error instanceof ToolError) return error.message;
  if (error instanceof TRPCError && error.code !== "INTERNAL_SERVER_ERROR") return error.message;
  if (error instanceof ZodError) {
    return `That change isn't valid: ${error.issues.map((i) => `${i.path.join(".") || "value"}: ${i.message}`).join("; ")}`;
  }
  console.error("[mcp] tool failed", error);
  return "Something went wrong on the server. Try again.";
}

/** Runs a tool body, turning expected failures into tool errors the model sees. */
async function run(body: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await body();
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: errorMessage(error) }] };
  }
}

// ---------- Links ----------

const editorUrl = (versionId: string) => `${appUrl()}/resume?v=${versionId}`;
const resumePdfUrl = (versionId: string) => `${appUrl()}/api/pdf/resume/${versionId}`;
const coverLetterUrl = (id: string) => `${appUrl()}/cover-letters/${id}`;
const coverLetterPdfUrl = (id: string) => `${appUrl()}/api/pdf/cover-letter/${id}`;

// ---------- Describing the resume ----------

/** Drops empty values so results stay short. */
function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== "" && v !== null && v !== undefined && v !== false),
  ) as Partial<T>;
}

type Located =
  | { kind: "section"; scope: ItemScope; label: string }
  | { kind: "entry"; scope: ItemScope; sectionId: string; label: string }
  | { kind: "contact"; scope: ItemScope; label: string };

/** Finds what an id refers to: a section, an entry (in which section), or a contact. */
function locate(content: ResumeContent, id: string): Located {
  const section = content.sections.find((s) => s.id === id);
  if (section) return { kind: "section", scope: { kind: "section" }, label: `section "${section.title}"` };
  for (const s of content.sections) {
    if (s.type === "profile") continue;
    const entry = s.entries.find((e) => e.id === id);
    if (entry) {
      return {
        kind: "entry",
        scope: { kind: "entry", sectionId: s.id },
        sectionId: s.id,
        label: `entry "${entry.title || SECTION_CONFIG[s.type].emptyTitle}"`,
      };
    }
  }
  const contact = content.personal.contacts.find((c) => c.id === id);
  if (contact) return { kind: "contact", scope: { kind: "contact" }, label: `contact "${contact.value || contact.url || contact.type}"` };
  throw new ToolError(`Nothing with id ${id}. Call get_resume for current ids.`);
}

function shownIn(versions: ResumeVersion[], scope: ItemScope, id: string) {
  return versions.filter((v) => isShown(v.layout, scope, id)).map((v) => v.name);
}

function describeEntry(entry: Entry, versions: ResumeVersion[], sectionId: string) {
  return {
    ...compact({
      id: entry.id,
      title: entry.title,
      subtitle: entry.subtitle,
      subtitleUrl: entry.subtitleUrl,
      location: entry.location,
      url: entry.url,
      level: entry.level,
      startDate: entry.startDate,
      endDate: entry.endDate,
      current: entry.current,
      currentLabel: entry.currentLabel,
      description: richTextToMarkdown(entry.description),
    }),
    shownIn: shownIn(versions, { kind: "entry", sectionId }, entry.id),
  };
}

function describeContact(contact: ContactField, versions: ResumeVersion[]) {
  return {
    ...compact({ id: contact.id, type: contact.type, value: contact.value, url: contact.url }),
    ...(contact.linked === false && { linked: false }),
    shownIn: shownIn(versions, { kind: "contact" }, contact.id),
  };
}

/** All of the resume's text, with where each item shows. */
function describeResume(resume: LoadedResume) {
  const { content, versions } = resume;
  return {
    versions: versions.map((v) => ({
      id: v.id,
      name: v.name,
      ...(v.id === resume.lastVersionId && { lastOpenedInEditor: true }),
    })),
    name: content.personal.name,
    contacts: content.personal.contacts.map((c) => describeContact(c, versions)),
    sections: content.sections.map((section) =>
      section.type === "profile"
        ? {
            id: section.id,
            type: section.type,
            title: section.title,
            content: richTextToMarkdown(section.content),
            shownIn: shownIn(versions, { kind: "section" }, section.id),
          }
        : {
            id: section.id,
            type: section.type,
            title: section.title,
            shownIn: shownIn(versions, { kind: "section" }, section.id),
            entries: section.entries.map((e) => describeEntry(e, versions, section.id)),
          },
    ),
  };
}

/** One version as it reads: everything in its order, whether it shows, and its design. */
function describeVersion(resume: LoadedResume, version: ResumeVersion) {
  const { content } = resume;
  return {
    id: version.id,
    name: version.name,
    editorUrl: editorUrl(version.id),
    pdfUrl: resumePdfUrl(version.id),
    contacts: ordered(content.personal.contacts, version.layout.contacts).map(({ item, shown }) => ({
      id: item.id,
      type: item.type,
      text: item.value || item.url,
      shown,
      ...(version.layout.contacts.find((c) => c.id === item.id)?.linkDisplay && {
        linkDisplay: version.layout.contacts.find((c) => c.id === item.id)!.linkDisplay,
      }),
    })),
    sections: ordered(content.sections, version.layout.sections).map(({ item: section, shown }) =>
      section.type === "profile"
        ? { id: section.id, type: section.type, title: section.title, shown, preview: richTextToPlain(section.content).slice(0, 120) }
        : {
            id: section.id,
            type: section.type,
            title: section.title,
            shown,
            entries: ordered(section.entries, layoutList(version.layout, { kind: "entry", sectionId: section.id })).map(
              ({ item: entry, shown: entryShown }) => ({
                id: entry.id,
                text: [entry.title, entry.subtitle].filter(Boolean).join(" · ") || SECTION_CONFIG[section.type].emptyTitle,
                shown: entryShown,
              }),
            ),
          },
    ),
    design: version.design,
  };
}

function findVersion(resume: LoadedResume, versionId: string) {
  const version = resume.versions.find((v) => v.id === versionId);
  if (!version) throw new ToolError(`No version with id ${versionId}. Call get_resume for current ids.`);
  return version;
}

/** After an edit to shared text: which versions it changed in, when that's more than one. */
function sharedNote(names: string[]) {
  if (names.length === 0) return " It isn't shown in any version yet.";
  if (names.length === 1) return ` Shown in "${names[0]}".`;
  return ` This text is shared, so it changed in every version showing it: ${names.join(", ")}.`;
}

// ---------- Inputs ----------

const id = z.string().min(1).max(64);
const versionId = id.describe("Id of the version, from get_resume.");
const text = (max = 300) => z.string().max(max);
const monthDate = z
  .string()
  .regex(/^(\d{4}-\d{2})?$/, "Use YYYY-MM, or an empty string to clear it.")
  .describe("YYYY-MM, or empty.");
const markdown = z
  .string()
  .max(20_000)
  .describe("Markdown: **bold**, _italic_, <u>underline</u>, [links](https://…), bullet (- ) and numbered (1. ) lists. Empty clears it.");

const entryFields = z.object({
  title: text().optional().describe("Job title, degree, project name, skill group, language, certificate…"),
  subtitle: text().optional().describe("Employer, school, issuer… (experience, education, certifications, custom)."),
  subtitleUrl: text().optional().describe("Link for the subtitle, e.g. the employer's site."),
  location: text().optional(),
  url: text().optional().describe("Link: a project's URL, a certificate link, or the URL of a links entry."),
  level: text().optional().describe("Details for skills (e.g. 'TypeScript, Go') and languages (e.g. 'Native')."),
  startDate: monthDate.optional(),
  endDate: monthDate.optional(),
  current: z.boolean().optional().describe("Still ongoing; shows currentLabel (default 'Present') instead of an end date."),
  currentLabel: text().optional(),
  description: markdown.optional(),
});
type EntryFields = z.infer<typeof entryFields>;

function applyEntryFields(entry: Entry, fields: EntryFields) {
  const { description, ...rest } = fields;
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) (entry as Record<string, unknown>)[key] = value;
  }
  if (description !== undefined) entry.description = markdownToRichText(description);
}

const contactFields = z.object({
  type: z.enum(CONTACT_TYPES).optional(),
  value: text().optional().describe("Text shown on the resume. Linkable types fall back to the URL when empty."),
  url: text().optional().describe("Link target for website, linkedin, github and custom contacts."),
  linked: z.boolean().optional().describe("For email and phone: whether they link as mailto:/tel:."),
});

const sectionTypes = z.enum(["profile", ...LIST_SECTION_TYPES]);

const recipientFields = z.object({
  name: text().optional(),
  title: text().optional(),
  company: text().optional(),
  address: text(600).optional(),
});

const coverLetterFields = z.object({
  title: z.string().trim().min(1).max(120).optional().describe("Name of the cover letter in the app (not printed)."),
  recipient: recipientFields.optional(),
  date: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use YYYY-MM-DD.")
    .optional()
    .describe("YYYY-MM-DD, or empty to leave it off."),
  subject: text().optional(),
  greeting: text().optional().describe("e.g. 'Dear Hiring Manager,'"),
  body: markdown.optional(),
  closing: text().optional().describe("e.g. 'Sincerely,'"),
  signature: text().optional(),
  design: designObjectSchema.partial().optional().describe("Design settings to change; others stay as they are."),
});

// ---------- Tools ----------

const READ = { readOnlyHint: true, openWorldHint: false } as const;
const ADD = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;
const OVERWRITE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false } as const;

export const SERVER_INSTRUCTIONS = `SWE Resume is a resume and cover letter builder. Each user has one resume and any number of versions of it, plus cover letters.

How the resume works:
- The resume's text (name, contacts, sections, entries) is shared by every version.
- A version only chooses which sections, entries and contacts it shows, in what order, and its design. Tailoring a resume for a job means creating a version (create_version) and changing what it shows (set_visibility, reorder) and how it looks (update_design).
- Editing text (update_entry, update_section, update_contact) changes it in every version that shows it. To reword something for one version only, call fork_item first and edit the copy it returns.
- New sections, entries and contacts show only in the version you add them to.
- Nothing can be deleted through these tools. To drop something from a version, hide it with set_visibility.
- Rich text (profile text, entry descriptions, cover letter body) is Markdown. Month dates are YYYY-MM.

Start with get_resume to see the text, the versions and their ids. Tell the user what you changed and give them the editor link from the result.`;

export function registerTools(server: McpServer, getUser: (ctx: unknown) => ResumeUser) {
  // ----- Read -----

  server.registerTool(
    "get_resume",
    {
      title: "Get resume",
      description:
        "Returns the whole resume: its versions, the name, contacts, sections and entries (with Markdown descriptions), and which versions show each item. Call this first to get ids.",
      inputSchema: z.object({}),
      annotations: READ,
    },
    (_args, ctx) =>
      run(async () => {
        const resume = await loadResume(db, getUser(ctx));
        return ok("The resume (text is shared by all versions; shownIn lists the versions showing each item):", describeResume(resume));
      }),
  );

  server.registerTool(
    "get_version",
    {
      title: "Get version",
      description:
        "Returns one version: every section, entry and contact in that version's order with whether it's shown, plus its design settings and links to open it in the editor or download its PDF.",
      inputSchema: z.object({ versionId }),
      annotations: READ,
    },
    ({ versionId }, ctx) =>
      run(async () => {
        const resume = await loadResume(db, getUser(ctx));
        return ok(`Version "${findVersion(resume, versionId).name}":`, describeVersion(resume, findVersion(resume, versionId)));
      }),
  );

  // ----- Shared text -----

  const edit = <T>(ctx: unknown, activeVersionId: string | null, recipe: (draft: ResumeDraft) => T) =>
    editResume(db, getUser(ctx), activeVersionId, recipe);

  server.registerTool(
    "update_name",
    {
      title: "Update name",
      description: "Changes the name at the top of the resume (shared by every version).",
      inputSchema: z.object({ name: text().min(1) }),
      annotations: OVERWRITE,
    },
    ({ name }, ctx) =>
      run(async () => {
        await edit(ctx, null, (draft) => void (draft.content.personal.name = name.trim()));
        return ok(`Name changed to "${name.trim()}" in every version.`);
      }),
  );

  server.registerTool(
    "add_contact",
    {
      title: "Add contact",
      description:
        "Adds a contact detail (email, phone, location, website, linkedin, github or a custom field) to the resume. It shows only in the given version.",
      inputSchema: contactFields.extend({ versionId, type: z.enum(CONTACT_TYPES) }),
      annotations: ADD,
    },
    ({ versionId, ...fields }, ctx) =>
      run(async () => {
        const { result: contact, resume } = await edit(ctx, versionId, (draft) => {
          const contact = { ...newContact(fields.type, fields.value ?? ""), url: fields.url ?? "" };
          if (fields.linked === false) contact.linked = false;
          addContact(draft, contact);
          return contact;
        });
        return ok(`Contact added to "${findVersion(resume, versionId).name}".`, { id: contact.id, editorUrl: editorUrl(versionId) });
      }),
  );

  server.registerTool(
    "update_contact",
    {
      title: "Update contact",
      description:
        "Changes a contact's type, text, link or linking. Contacts are shared: this changes it in every version that shows it (use fork_item to change it for one version).",
      inputSchema: contactFields.extend({ contactId: id }),
      annotations: OVERWRITE,
    },
    ({ contactId, ...fields }, ctx) =>
      run(async () => {
        const { resume } = await edit(ctx, null, (draft) => {
          const contact = draft.content.personal.contacts.find((c) => c.id === contactId);
          if (!contact) throw new ToolError(`No contact with id ${contactId}. Call get_resume for current ids.`);
          if (fields.type !== undefined) contact.type = fields.type;
          if (fields.value !== undefined) contact.value = fields.value;
          if (fields.url !== undefined) contact.url = fields.url;
          if (fields.linked !== undefined) contact.linked = fields.linked ? undefined : false;
        });
        return ok(`Contact updated.${sharedNote(shownIn(resume.versions, { kind: "contact" }, contactId))}`);
      }),
  );

  server.registerTool(
    "add_section",
    {
      title: "Add section",
      description: `Adds a section to the resume, shown only in the given version. Types: profile (a summary paragraph), ${LIST_SECTION_TYPES.join(", ")}. Add entries to list sections with add_entry.`,
      inputSchema: z.object({
        versionId,
        type: sectionTypes,
        title: text().optional().describe("Heading; defaults to the type's name (e.g. 'Experience')."),
        content: markdown.optional().describe("Profile sections only: the summary text, in Markdown."),
      }),
      annotations: ADD,
    },
    ({ versionId, type, title, content }, ctx) =>
      run(async () => {
        const { result: section, resume } = await edit(ctx, versionId, (draft) => {
          const section = newSection(type);
          if (title?.trim()) section.title = title.trim();
          if (content !== undefined) {
            if (section.type !== "profile") throw new ToolError("Only profile sections have text; add entries with add_entry.");
            section.content = markdownToRichText(content);
          }
          addSection(draft, section);
          return section;
        });
        return ok(`Section "${section.title}" added to "${findVersion(resume, versionId).name}".`, {
          id: section.id,
          editorUrl: editorUrl(versionId),
        });
      }),
  );

  server.registerTool(
    "update_section",
    {
      title: "Update section",
      description:
        "Renames a section, or changes a profile section's text. Sections are shared: this changes it in every version that shows it (use fork_item to change it for one version).",
      inputSchema: z.object({
        sectionId: id,
        title: text().optional(),
        content: markdown.optional().describe("Profile sections only."),
      }),
      annotations: OVERWRITE,
    },
    ({ sectionId, title, content }, ctx) =>
      run(async () => {
        const { resume } = await edit(ctx, null, (draft) => {
          const section = findSection(draft, sectionId);
          if (!section) throw new ToolError(`No section with id ${sectionId}. Call get_resume for current ids.`);
          if (title !== undefined) section.title = title.trim();
          if (content !== undefined) {
            if (section.type !== "profile") throw new ToolError("Only profile sections have text; change entries with update_entry.");
            section.content = markdownToRichText(content);
          }
        });
        return ok(`Section updated.${sharedNote(shownIn(resume.versions, { kind: "section" }, sectionId))}`);
      }),
  );

  server.registerTool(
    "add_entry",
    {
      title: "Add entry",
      description:
        "Adds an entry (a position, degree, project, skill group, language, certification, link…) to a list section. It shows only in the given version, at the end of the section.",
      inputSchema: entryFields.extend({ versionId, sectionId: id }),
      annotations: ADD,
    },
    ({ versionId, sectionId, ...fields }, ctx) =>
      run(async () => {
        const { result: entry, resume } = await edit(ctx, versionId, (draft) => {
          const section = findSection(draft, sectionId);
          if (!section) throw new ToolError(`No section with id ${sectionId}. Call get_resume for current ids.`);
          if (section.type === "profile") throw new ToolError("Profile sections have no entries; change their text with update_section.");
          const entry = emptyEntry();
          applyEntryFields(entry, fields);
          addEntry(draft, sectionId, entry);
          return entry;
        });
        const version = findVersion(resume, versionId);
        const hiddenSection = !isShown(version.layout, { kind: "section" }, sectionId)
          ? " Its section is hidden in this version; show it with set_visibility."
          : "";
        return ok(`Entry added to "${version.name}".${hiddenSection}`, { id: entry.id, editorUrl: editorUrl(versionId) });
      }),
  );

  server.registerTool(
    "update_entry",
    {
      title: "Update entry",
      description:
        "Changes an entry's fields; fields you leave out stay as they are. Entries are shared: this changes it in every version that shows it. To reword it for one version only, call fork_item first and update the copy.",
      inputSchema: entryFields.extend({ entryId: id }),
      annotations: OVERWRITE,
    },
    ({ entryId, ...fields }, ctx) =>
      run(async () => {
        let sectionId = "";
        const { resume } = await edit(ctx, null, (draft) => {
          for (const section of draft.content.sections) {
            if (section.type === "profile") continue;
            const entry = section.entries.find((e) => e.id === entryId);
            if (!entry) continue;
            applyEntryFields(entry, fields);
            sectionId = section.id;
            return;
          }
          throw new ToolError(`No entry with id ${entryId}. Call get_resume for current ids.`);
        });
        return ok(`Entry updated.${sharedNote(shownIn(resume.versions, { kind: "entry", sectionId }, entryId))}`);
      }),
  );

  server.registerTool(
    "fork_item",
    {
      title: "Fork for one version",
      description:
        "Makes a version-only copy of a shared section, entry or contact so its text can differ in that version: the copy takes the original's place in the version and the original is hidden there (other versions are unchanged). Returns the copy's id; edit it with the update tools.",
      inputSchema: z.object({ itemId: id.describe("Id of the section, entry or contact."), versionId }),
      annotations: ADD,
    },
    ({ itemId, versionId }, ctx) =>
      run(async () => {
        const current = await loadResume(db, getUser(ctx));
        const version = findVersion(current, versionId);
        const found = locate(current.content, itemId);
        const versions = shownIn(current.versions, found.scope, itemId);
        if (!versions.includes(version.name)) {
          throw new ToolError(`The ${found.label} isn't shown in "${version.name}". Show it with set_visibility, or add a new item instead.`);
        }
        if (versions.length === 1) {
          return ok(`The ${found.label} is only shown in "${version.name}", so it can be edited directly; no copy needed.`, { id: itemId });
        }
        const { result: copyId } = await edit(ctx, versionId, (draft) => {
          const copy =
            found.kind === "section"
              ? duplicateSection(draft, itemId)
              : found.kind === "entry"
                ? duplicateEntry(draft, found.sectionId, itemId)
                : duplicateContact(draft, itemId);
          if (!copy) throw new ToolError(`Couldn't copy the ${found.label}.`);
          setShownIn(draft, versionId, found.scope, itemId, false);
          return copy.id;
        });
        return ok(`Made a copy of the ${found.label} for "${version.name}"; the original still shows in ${versions.filter((n) => n !== version.name).join(", ")}.`, {
          id: copyId,
        });
      }),
  );

  // ----- Versions -----

  server.registerTool(
    "create_version",
    {
      title: "Create version",
      description:
        "Creates a new version as a copy of an existing one (same items shown, same order, same design). Use it to tailor the resume for a job without changing other versions.",
      inputSchema: z.object({ name: versionNameSchema.describe("e.g. 'Google – Backend'."), sourceVersionId: versionId }),
      annotations: ADD,
    },
    ({ name, sourceVersionId }, ctx) =>
      run(async () => {
        const { result: version } = await edit(ctx, sourceVersionId, (draft) =>
          createVersion(draft, { name: name.trim(), sourceId: sourceVersionId }),
        );
        return ok(`Created version "${version.name}".`, { id: version.id, editorUrl: editorUrl(version.id) });
      }),
  );

  server.registerTool(
    "rename_version",
    {
      title: "Rename version",
      description: "Renames a version. Version names are private to the user and never printed.",
      inputSchema: z.object({ versionId, name: versionNameSchema }),
      annotations: OVERWRITE,
    },
    ({ versionId, name }, ctx) =>
      run(async () => {
        await edit(ctx, versionId, (draft) => {
          draft.versions.find((v) => v.id === versionId)!.name = name.trim();
        });
        return ok(`Version renamed to "${name.trim()}".`);
      }),
  );

  server.registerTool(
    "set_visibility",
    {
      title: "Show or hide items",
      description:
        "Shows or hides sections, entries and contacts in one version. Hidden items stay in the resume and in other versions; this is how to remove something from a version.",
      inputSchema: z.object({
        versionId,
        items: z
          .array(z.object({ id: id.describe("Id of a section, entry or contact."), shown: z.boolean() }))
          .min(1)
          .max(200),
      }),
      annotations: OVERWRITE,
    },
    ({ versionId, items }, ctx) =>
      run(async () => {
        const { resume } = await edit(ctx, versionId, (draft) => {
          for (const item of items) setShownIn(draft, versionId, locate(draft.content, item.id).scope, item.id, item.shown);
        });
        const version = findVersion(resume, versionId);
        const shown = items.filter((i) => i.shown).length;
        const hiddenParents = items
          .filter((i) => i.shown)
          .map((i) => locate(resume.content, i.id))
          .filter((f): f is Extract<Located, { kind: "entry" }> => f.kind === "entry")
          .filter((f) => !isShown(version.layout, { kind: "section" }, f.sectionId));
        const note = hiddenParents.length ? " Some of those entries are in sections hidden in this version; show the sections too." : "";
        return ok(`In "${version.name}": ${shown} shown, ${items.length - shown} hidden.${note}`, { editorUrl: editorUrl(versionId) });
      }),
  );

  server.registerTool(
    "reorder",
    {
      title: "Reorder",
      description:
        "Changes the order of sections, of the entries in one section, or of contacts, in one version. Pass ids of one kind in the order you want; ones you leave out keep their order after them.",
      inputSchema: z.object({
        versionId,
        orderedIds: z.array(id).min(1).max(100).describe("All section ids, all entry ids of one section, or all contact ids."),
      }),
      annotations: OVERWRITE,
    },
    ({ versionId, orderedIds: ids }, ctx) =>
      run(async () => {
        const { resume } = await edit(ctx, versionId, (draft) => {
          const scopes = ids.map((itemId) => locate(draft.content, itemId).scope);
          const scope = scopes[0];
          if (scopes.some((s) => JSON.stringify(s) !== JSON.stringify(scope))) {
            throw new ToolError("Reorder one kind at a time: sections, the entries of a single section, or contacts.");
          }
          const version = draft.versions.find((v) => v.id === versionId)!;
          const list = layoutList(version.layout, scope);
          if (!list) throw new ToolError("Couldn't find that list in this version.");
          const currentOrder = orderedIds(draft, scope);
          const nextOrder = [...new Set(ids), ...currentOrder.filter((x) => !ids.includes(x))];
          const byId = new Map(list.map((item) => [item.id, item]));
          list.splice(0, list.length, ...nextOrder.map((itemId) => byId.get(itemId) ?? { id: itemId, shown: false, entries: [] }));
        });
        return ok(`Reordered in "${findVersion(resume, versionId).name}".`, { editorUrl: editorUrl(versionId) });
      }),
  );

  server.registerTool(
    "update_design",
    {
      title: "Update design",
      description:
        "Changes one version's design: colors, font, sizes, spacing, columns, header, contact style, link display ('label' or 'url'), page size, date format and more. Settings you leave out stay as they are. Each version has its own design; copyToVersionIds also gives the resulting design to other versions.",
      inputSchema: z.object({
        versionId,
        design: designObjectSchema.partial(),
        copyToVersionIds: z.array(id).max(50).optional(),
      }),
      annotations: OVERWRITE,
    },
    ({ versionId, design, copyToVersionIds }, ctx) =>
      run(async () => {
        const { resume } = await edit(ctx, versionId, (draft) => {
          const version = draft.versions.find((v) => v.id === versionId)!;
          version.design = designSchema.parse({ ...version.design, ...design });
          if (copyToVersionIds?.length) {
            for (const target of copyToVersionIds) {
              if (!draft.versions.some((v) => v.id === target)) throw new ToolError(`No version with id ${target}.`);
            }
            copyDesignTo(draft, copyToVersionIds);
          }
        });
        const copied = copyToVersionIds?.length ? ` Copied to ${copyToVersionIds.length} other version(s).` : "";
        return ok(`Design updated for "${findVersion(resume, versionId).name}".${copied}`, { editorUrl: editorUrl(versionId) });
      }),
  );

  // ----- Cover letters -----

  const ownCoverLetter = async (ctx: unknown, coverLetterId: string) => {
    const parsed = z.uuid().safeParse(coverLetterId);
    const [row] = parsed.success
      ? await db
          .select()
          .from(coverLetter)
          .where(and(eq(coverLetter.id, coverLetterId), eq(coverLetter.userId, getUser(ctx).id)))
      : [];
    if (!row) throw new ToolError(`No cover letter with id ${coverLetterId}. Call list_cover_letters.`);
    return row;
  };

  const describeCoverLetter = (row: typeof coverLetter.$inferSelect) => {
    const content = coverLetterContentSchema.parse(row.content);
    return {
      id: row.id,
      title: row.title,
      editorUrl: coverLetterUrl(row.id),
      pdfUrl: coverLetterPdfUrl(row.id),
      sender: { name: content.sender.name, contacts: content.sender.contacts.map((c) => compact({ type: c.type, value: c.value, url: c.url })) },
      recipient: content.recipient,
      date: content.date,
      subject: content.subject,
      greeting: content.greeting,
      body: richTextToMarkdown(content.body),
      closing: content.closing,
      signature: content.signature,
      design: designSchema.parse(row.design),
    };
  };

  const applyCoverLetterFields = (
    row: Pick<typeof coverLetter.$inferSelect, "content" | "design" | "title">,
    fields: z.infer<typeof coverLetterFields>,
  ) => {
    const content = coverLetterContentSchema.parse(row.content);
    const { title, recipient, body, design, ...rest } = fields;
    if (recipient) content.recipient = { ...content.recipient, ...compactUndefined(recipient) };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) (content as Record<string, unknown>)[key] = value;
    }
    if (body !== undefined) content.body = markdownToRichText(body);
    return {
      title: title?.trim() || row.title,
      content: coverLetterContentSchema.parse(content),
      design: design ? designSchema.parse({ ...designSchema.parse(row.design), ...design }) : designSchema.parse(row.design),
    };
  };

  server.registerTool(
    "list_cover_letters",
    {
      title: "List cover letters",
      description: "Lists the user's cover letters, most recently edited first.",
      inputSchema: z.object({}),
      annotations: READ,
    },
    (_args, ctx) =>
      run(async () => {
        const rows = await db
          .select({ id: coverLetter.id, title: coverLetter.title, updatedAt: coverLetter.updatedAt, content: coverLetter.content })
          .from(coverLetter)
          .where(eq(coverLetter.userId, getUser(ctx).id))
          .orderBy(desc(coverLetter.updatedAt));
        const letters = rows.map((row) => {
          const content = coverLetterContentSchema.parse(row.content);
          return compact({
            id: row.id,
            title: row.title,
            company: content.recipient.company,
            subject: content.subject,
            updatedAt: row.updatedAt.toISOString(),
          });
        });
        return ok(letters.length ? `${letters.length} cover letter(s):` : "No cover letters yet.", letters.length ? letters : undefined);
      }),
  );

  server.registerTool(
    "get_cover_letter",
    {
      title: "Get cover letter",
      description: "Returns a cover letter's text (body in Markdown), design and links.",
      inputSchema: z.object({ coverLetterId: id }),
      annotations: READ,
    },
    ({ coverLetterId }, ctx) =>
      run(async () => ok("The cover letter:", describeCoverLetter(await ownCoverLetter(ctx, coverLetterId)))),
  );

  server.registerTool(
    "create_cover_letter",
    {
      title: "Create cover letter",
      description:
        "Creates a cover letter. The sender is the user's name and email; anything you leave out starts with the app's defaults (today's date, 'Dear Hiring Manager,', 'Sincerely,').",
      inputSchema: coverLetterFields.extend({ title: z.string().trim().min(1).max(120).describe("e.g. 'Google – Backend'.") }),
      annotations: ADD,
    },
    (fields, ctx) =>
      run(async () => {
        const user = getUser(ctx);
        const next = applyCoverLetterFields(
          {
            title: fields.title,
            content: blankCoverLetterContent({ name: user.name, email: user.email }),
            design: defaultCoverLetterDesign(),
          },
          fields,
        );
        const [row] = await db
          .insert(coverLetter)
          .values({ userId: user.id, ...next })
          .returning({ id: coverLetter.id });
        return ok(`Created cover letter "${next.title}".`, { id: row.id, editorUrl: coverLetterUrl(row.id) });
      }),
  );

  server.registerTool(
    "update_cover_letter",
    {
      title: "Update cover letter",
      description: "Changes a cover letter's text or design. Fields you leave out stay as they are.",
      inputSchema: coverLetterFields.extend({ coverLetterId: id }),
      annotations: OVERWRITE,
    },
    ({ coverLetterId, ...fields }, ctx) =>
      run(async () => {
        const row = await ownCoverLetter(ctx, coverLetterId);
        const next = applyCoverLetterFields(row, fields);
        await db
          .update(coverLetter)
          .set({ ...next, updatedAt: new Date() })
          .where(and(eq(coverLetter.id, coverLetterId), eq(coverLetter.userId, getUser(ctx).id)));
        return ok(`Cover letter "${next.title}" updated.`, { editorUrl: coverLetterUrl(coverLetterId) });
      }),
  );

  // ----- Links -----

  server.registerTool(
    "get_pdf_link",
    {
      title: "Get PDF link",
      description:
        "Returns the link to open a resume version or cover letter in the editor, and its PDF download link. Both open in the user's browser while they're signed in to SWE Resume.",
      inputSchema: z.object({
        versionId: id.optional().describe("A resume version's id."),
        coverLetterId: id.optional().describe("A cover letter's id."),
      }),
      annotations: READ,
    },
    ({ versionId, coverLetterId }, ctx) =>
      run(async () => {
        if (coverLetterId) {
          const row = await ownCoverLetter(ctx, coverLetterId);
          return ok(`Links for "${row.title}" (open while signed in):`, { editorUrl: coverLetterUrl(row.id), pdfUrl: coverLetterPdfUrl(row.id) });
        }
        if (!versionId) throw new ToolError("Pass a versionId or a coverLetterId.");
        const resume = await loadResume(db, getUser(ctx));
        const version = findVersion(resume, versionId);
        return ok(`Links for "${version.name}" (open while signed in):`, { editorUrl: editorUrl(version.id), pdfUrl: resumePdfUrl(version.id) });
      }),
  );
}

function compactUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> };
}
