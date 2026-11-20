"use client";

import { current } from "immer";
import { createContext, use, type ReactNode } from "react";
import { temporal } from "zundo";
import { useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createStore } from "zustand/vanilla";
import type { ContactField, Entry, ResumeContent, Section } from "@/lib/documents/schema";
import { newId } from "@/lib/documents/sections";
import {
  addToVersions,
  layoutList,
  moveInLayout,
  ordered,
  removeFromVersions,
  setShown,
  type ItemScope,
  type ResumeVersion,
} from "@/lib/documents/versions";
import { HistoryProvider, throttleHistory } from "./history";

/** Everything the resume editor saves: the shared text, every version, and the PDF file name. */
export type ResumeData = { content: ResumeContent; versions: ResumeVersion[]; fileName: string };

export type ResumeStoreState = ResumeData & {
  /** The version being edited and previewed. Not part of undo history. */
  activeVersionId: string;
  setActiveVersion: (id: string) => void;
  /** Applies any edit, to the shared content, the versions, or both. */
  update: (recipe: (draft: ResumeStoreState) => void) => void;
};

export function createResumeStore(initial: ResumeData & { activeVersionId: string }) {
  return createStore<ResumeStoreState>()(
    temporal(
      immer((set) => ({
        ...initial,
        setActiveVersion: (id) => set({ activeVersionId: id }),
        update: (recipe) => set((state) => void recipe(state)),
      })),
      {
        limit: 200,
        partialize: ({ content, versions, fileName }) => ({ content, versions, fileName }),
        equality: (a, b) => a.content === b.content && a.versions === b.versions && a.fileName === b.fileName,
        handleSet: (handleSet) => throttleHistory(handleSet as (...args: unknown[]) => void),
      },
    ),
  );
}

export type ResumeStore = ReturnType<typeof createResumeStore>;

/** Undo/redo, then switch to the version the step changed, so the change is visible. */
function step(store: ResumeStore, direction: "undo" | "redo") {
  const before = store.getState().versions;
  store.temporal.getState()[direction]();
  const { versions, activeVersionId, setActiveVersion } = store.getState();
  const changed = versions.filter((v) => !before.includes(v));
  if (changed.length === 1 && changed[0].id !== activeVersionId) setActiveVersion(changed[0].id);
  else if (!versions.some((v) => v.id === activeVersionId)) setActiveVersion(versions[0].id);
}

const ResumeStoreContext = createContext<ResumeStore | null>(null);

export function ResumeStoreProvider({ store, children }: { store: ResumeStore; children: ReactNode }) {
  const canUndo = useStore(store.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(store.temporal, (s) => s.futureStates.length > 0);
  const history = { canUndo, canRedo, undo: () => step(store, "undo"), redo: () => step(store, "redo") };
  return (
    <ResumeStoreContext value={store}>
      <HistoryProvider value={history}>{children}</HistoryProvider>
    </ResumeStoreContext>
  );
}

export function useResumeStoreApi() {
  const store = use(ResumeStoreContext);
  if (!store) throw new Error("useResume must be used inside ResumeStoreProvider");
  return store;
}

export function useResume<T>(selector: (state: ResumeStoreState) => T): T {
  return useStore(useResumeStoreApi(), selector);
}

export function getActiveVersion(state: Pick<ResumeStoreState, "versions" | "activeVersionId">) {
  return state.versions.find((v) => v.id === state.activeVersionId) ?? state.versions[0];
}

export function useActiveVersion() {
  return useResume(getActiveVersion);
}

export function useUpdate() {
  return useResume((s) => s.update);
}

// ---------- Edits (immer recipes over the whole state) ----------

type Draft = ResumeStoreState;

function findSection(draft: Draft, sectionId: string) {
  return draft.content.sections.find((s) => s.id === sectionId);
}

function itemsFor(draft: Draft, scope: ItemScope): { id: string }[] {
  if (scope.kind === "section") return draft.content.sections;
  if (scope.kind === "contact") return draft.content.personal.contacts;
  const section = findSection(draft, scope.sectionId);
  return section && section.type !== "profile" ? section.entries : [];
}

/** Ids for a scope in the active version's order (hidden ones included). */
export function orderedIds(draft: Pick<Draft, "content" | "versions" | "activeVersionId">, scope: ItemScope) {
  return ordered(itemsFor(draft as Draft, scope), layoutList(getActiveVersion(draft).layout, scope)).map((x) => x.item.id);
}

/** The id the active version shows last for a scope, so new items land at the end of what you see. */
function lastId(draft: Draft, scope: ItemScope) {
  return orderedIds(draft, scope).at(-1) ?? null;
}

export function setShownIn(draft: Draft, versionId: string, scope: ItemScope, itemId: string, shown: boolean) {
  const version = draft.versions.find((v) => v.id === versionId);
  if (version) setShown(version.layout, scope, itemId, shown);
}

export function moveItem(draft: Draft, scope: ItemScope, activeId: string, overId: string) {
  moveInLayout(getActiveVersion(draft).layout, scope, orderedIds(draft, scope), activeId, overId);
}

export function addSection(draft: Draft, section: Section) {
  const scope: ItemScope = { kind: "section" };
  const after = lastId(draft, scope);
  draft.content.sections.push(section);
  addToVersions(draft.versions, scope, draft.activeVersionId, after, (_, shown) => ({ id: section.id, shown, entries: [] }));
}

/** Copies a section and its entries. The copy shows where the original does in the active version only. */
export function duplicateSection(draft: Draft, sectionId: string) {
  const original = findSection(draft, sectionId);
  if (!original) return null;
  const plain = current(original);
  const entryIds = new Map<string, string>();
  const copy: Section =
    plain.type === "profile"
      ? { ...structuredClone(plain), id: newId() }
      : {
          ...structuredClone(plain),
          id: newId(),
          entries: plain.entries.map((entry) => {
            const id = newId();
            entryIds.set(entry.id, id);
            return { ...structuredClone(entry), id };
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

export function addEntry(draft: Draft, sectionId: string, entry: Entry) {
  const section = findSection(draft, sectionId);
  if (!section || section.type === "profile") return;
  const scope: ItemScope = { kind: "entry", sectionId };
  const after = lastId(draft, scope);
  section.entries.push(entry);
  addToVersions(draft.versions, scope, draft.activeVersionId, after, (_, shown) => ({ id: entry.id, shown }));
}

export function duplicateEntry(draft: Draft, sectionId: string, entryId: string) {
  const section = findSection(draft, sectionId);
  if (!section || section.type === "profile") return;
  const index = section.entries.findIndex((e) => e.id === entryId);
  if (index === -1) return;
  const copy = { ...structuredClone(current(section.entries[index])), id: newId() };
  section.entries.splice(index + 1, 0, copy);
  addToVersions(draft.versions, { kind: "entry", sectionId }, draft.activeVersionId, entryId, (_, shown) => ({
    id: copy.id,
    shown,
  }));
}

export function addContact(draft: Draft, contact: ContactField) {
  const scope: ItemScope = { kind: "contact" };
  const after = lastId(draft, scope);
  draft.content.personal.contacts.push(contact);
  addToVersions(draft.versions, scope, draft.activeVersionId, after, (_, shown) => ({ id: contact.id, shown }));
}

/** Deletes an item from the shared resume, and so from every version. */
export function deleteItem(draft: Draft, scope: ItemScope, itemId: string) {
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

export function createVersion(draft: Draft, { name, sourceId }: { name: string; sourceId: string }) {
  const source = draft.versions.find((v) => v.id === sourceId) ?? getActiveVersion(draft);
  const plain = current(source);
  const version: ResumeVersion = {
    id: newId(),
    name,
    position: Math.max(...draft.versions.map((v) => v.position)) + 1,
    design: structuredClone(plain.design),
    layout: structuredClone(plain.layout),
  };
  draft.versions.push(version);
  draft.activeVersionId = version.id;
  return version;
}

export function deleteVersion(draft: Draft, versionId: string) {
  if (draft.versions.length <= 1) return;
  const index = draft.versions.findIndex((v) => v.id === versionId);
  draft.versions.splice(index, 1);
  if (draft.activeVersionId === versionId) {
    draft.activeVersionId = draft.versions[Math.min(index, draft.versions.length - 1)].id;
  }
}

/** Gives other versions the active version's design. */
export function copyDesignTo(draft: Draft, versionIds: string[]) {
  const design = current(getActiveVersion(draft).design);
  for (const version of draft.versions) {
    if (versionIds.includes(version.id)) version.design = structuredClone(design);
  }
}
