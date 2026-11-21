"use client";

import { createContext, use, type ReactNode } from "react";
import { temporal } from "zundo";
import { useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createStore } from "zustand/vanilla";
import { getActiveVersion } from "@/lib/documents/resume-edits";
import type { ResumeContent } from "@/lib/documents/schema";
import type { ResumeVersion } from "@/lib/documents/versions";
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

export { getActiveVersion };

export function useActiveVersion() {
  return useResume(getActiveVersion);
}

export function useUpdate() {
  return useResume((s) => s.update);
}

// ---------- Edits ----------

// The recipes live in lib/documents/resume-edits so the MCP server applies the same changes.
export {
  addContact,
  addEntry,
  addSection,
  copyDesignTo,
  createVersion,
  deleteItem,
  deleteVersion,
  duplicateEntry,
  duplicateSection,
  moveItem,
  orderedIds,
  setShownIn,
} from "@/lib/documents/resume-edits";
