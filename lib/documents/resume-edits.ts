import { current, isDraft, type Draft } from "immer";
import type { ContactField, Entry, ResumeContent, Section } from "./schema";
import { newId } from "./sections";
import {
  addToVersions,
  layoutList,
  moveInLayout,
  ordered,
  removeFromVersions,
  setShown,
  type ItemScope,
  type ResumeVersion,
} from "./versions";

// Edits to the shared resume and its versions, as immer recipes. The editor runs them on its store; the MCP
// server runs them on the saved resume, so both change the resume the same way.

/** What an edit works on: the shared text, every version, and the version the edit is made in. */
export type ResumeDraft = { content: ResumeContent; versions: ResumeVersion[]; activeVersionId: string };

/** A plain copy of a value that may be an immer draft. */
function plain<T>(value: T): T {
  return structuredClone(isDraft(value) ? (current(value as Draft<T>) as T) : value);
}

export function getActiveVersion(state: Pick<ResumeDraft, "versions" | "activeVersionId">) {
  return state.versions.find((v) => v.id === state.activeVersionId) ?? state.versions[0];
}

export function findSection(draft: Pick<ResumeDraft, "content">, sectionId: string) {
  return draft.content.sections.find((s) => s.id === sectionId);
}

function itemsFor(draft: Pick<ResumeDraft, "content">, scope: ItemScope): { id: string }[] {
  if (scope.kind === "section") return draft.content.sections;
  if (scope.kind === "contact") return draft.content.personal.contacts;
  const section = findSection(draft, scope.sectionId);
  return section && section.type !== "profile" ? section.entries : [];
}

/** Ids for a scope in the active version's order (hidden ones included). */
export function orderedIds(draft: ResumeDraft, scope: ItemScope) {
  return ordered(itemsFor(draft, scope), layoutList(getActiveVersion(draft).layout, scope)).map((x) => x.item.id);
}

/** The id the active version shows last for a scope, so new items land at the end of what you see. */
function lastId(draft: ResumeDraft, scope: ItemScope) {
  return orderedIds(draft, scope).at(-1) ?? null;
}

export function setShownIn(draft: ResumeDraft, versionId: string, scope: ItemScope, itemId: string, shown: boolean) {
  const version = draft.versions.find((v) => v.id === versionId);
  if (version) setShown(version.layout, scope, itemId, shown);
}

export function moveItem(draft: ResumeDraft, scope: ItemScope, activeId: string, overId: string) {
  moveInLayout(getActiveVersion(draft).layout, scope, orderedIds(draft, scope), activeId, overId);
}

export function addSection(draft: ResumeDraft, section: Section) {
  const scope: ItemScope = { kind: "section" };
  const after = lastId(draft, scope);
  draft.content.sections.push(section);
  addToVersions(draft.versions, scope, draft.activeVersionId, after, (_, shown) => ({ id: section.id, shown, entries: [] }));
}

/** Copies a section and its entries. The copy shows where the original does in the active version only. */
export function duplicateSection(draft: ResumeDraft, sectionId: string) {
  const original = findSection(draft, sectionId);
  if (!original) return null;
  const source = plain(original);
  const entryIds = new Map<string, string>();
  const copy: Section =
    source.type === "profile"
      ? { ...source, id: newId() }
      : {
          ...source,
          id: newId(),
          entries: source.entries.map((entry) => {
            const id = newId();
            entryIds.set(entry.id, id);
            return { ...entry, id };
          }),
        };
  const index = draft.content.sections.findIndex((s) => s.id === sectionId);
  draft.content.sections.splice(index + 1, 0, copy);
  addToVersions(draft.versions, { kind: "section" }, draft.activeVersionId, sectionId, (version, shown) => ({
    id: copy.id,
    shown,
    entries: (version.layout.sections.find((s) => s.id === sectionId)?.entries ?? []).flatMap((e) =>
      entryIds.has(e.id) ? [{ id: entryIds.get(e.id)!, shown: e.shown }] : [],
    ),
  }));
  return copy;
}

export function addEntry(draft: ResumeDraft, sectionId: string, entry: Entry) {
  const section = findSection(draft, sectionId);
  if (!section || section.type === "profile") return;
  const scope: ItemScope = { kind: "entry", sectionId };
  const after = lastId(draft, scope);
  section.entries.push(entry);
  addToVersions(draft.versions, scope, draft.activeVersionId, after, (_, shown) => ({ id: entry.id, shown }));
}

export function duplicateEntry(draft: ResumeDraft, sectionId: string, entryId: string) {
  const section = findSection(draft, sectionId);
  if (!section || section.type === "profile") return null;
  const index = section.entries.findIndex((e) => e.id === entryId);
  if (index === -1) return null;
  const copy = { ...plain(section.entries[index]), id: newId() };
  section.entries.splice(index + 1, 0, copy);
  addToVersions(draft.versions, { kind: "entry", sectionId }, draft.activeVersionId, entryId, (_, shown) => ({
    id: copy.id,
    shown,
  }));
  return copy;
}

export function addContact(draft: ResumeDraft, contact: ContactField) {
  const scope: ItemScope = { kind: "contact" };
  const after = lastId(draft, scope);
  draft.content.personal.contacts.push(contact);
  addToVersions(draft.versions, scope, draft.activeVersionId, after, (_, shown) => ({ id: contact.id, shown }));
}

/** Copies a contact right after the original. The copy shows in the active version only. */
export function duplicateContact(draft: ResumeDraft, contactId: string) {
  const contacts = draft.content.personal.contacts;
  const index = contacts.findIndex((c) => c.id === contactId);
  if (index === -1) return null;
  const copy = { ...plain(contacts[index]), id: newId() };
  contacts.splice(index + 1, 0, copy);
  addToVersions(draft.versions, { kind: "contact" }, draft.activeVersionId, contactId, (version, shown) => ({
    id: copy.id,
    shown,
    linkDisplay: version.layout.contacts.find((c) => c.id === contactId)?.linkDisplay,
  }));
  return copy;
}

/** Deletes an item from the shared resume, and so from every version. */
export function deleteItem(draft: ResumeDraft, scope: ItemScope, itemId: string) {
  if (scope.kind === "section") {
    draft.content.sections = draft.content.sections.filter((s) => s.id !== itemId);
  } else if (scope.kind === "contact") {
    draft.content.personal.contacts = draft.content.personal.contacts.filter((c) => c.id !== itemId);
  } else {
    const section = findSection(draft, scope.sectionId);
    if (section && section.type !== "profile") section.entries = section.entries.filter((e) => e.id !== itemId);
  }
  removeFromVersions(draft.versions, scope, itemId);
}

export function createVersion(draft: ResumeDraft, { name, sourceId }: { name: string; sourceId: string }) {
  const source = plain(draft.versions.find((v) => v.id === sourceId) ?? getActiveVersion(draft));
  const version: ResumeVersion = {
    id: newId(),
    name,
    position: Math.max(...draft.versions.map((v) => v.position)) + 1,
    design: source.design,
    layout: source.layout,
  };
  draft.versions.push(version);
  draft.activeVersionId = version.id;
  return version;
}

export function deleteVersion(draft: ResumeDraft, versionId: string) {
  if (draft.versions.length <= 1) return;
  const index = draft.versions.findIndex((v) => v.id === versionId);
  draft.versions.splice(index, 1);
  if (draft.activeVersionId === versionId) {
    draft.activeVersionId = draft.versions[Math.min(index, draft.versions.length - 1)].id;
  }
}

/** Gives other versions the active version's design. */
export function copyDesignTo(draft: ResumeDraft, versionIds: string[]) {
  const design = plain(getActiveVersion(draft).design);
  for (const version of draft.versions) {
    if (versionIds.includes(version.id)) version.design = structuredClone(design);
  }
}
