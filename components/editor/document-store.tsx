"use client";

import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";
import { temporal } from "zundo";
import { useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { DocumentDesign } from "@/lib/documents/schema";
import { HistoryProvider, throttleHistory } from "./history";

// Store for single-design documents (cover letters). Resumes use resume-store.tsx.

export type DocumentState<C> = { title: string; content: C; design: DocumentDesign };

type DocumentActions<C> = {
  setTitle: (title: string) => void;
  updateContent: (recipe: (draft: C) => void) => void;
  updateDesign: (recipe: (draft: DocumentDesign) => void) => void;
};

export type DocumentStoreState<C> = DocumentState<C> & DocumentActions<C>;

export function createDocumentStore<C>(initial: DocumentState<C>) {
  return createStore<DocumentStoreState<C>>()(
    temporal(
      immer((set) => ({
        ...initial,
        setTitle: (title) => set({ title }),
        updateContent: (recipe) => set((state) => void recipe(state.content as C)),
        updateDesign: (recipe) => set((state) => void recipe(state.design)),
      })),
      {
        limit: 200,
        partialize: ({ title, content, design }) => ({ title, content, design }),
        equality: (a, b) => a.title === b.title && a.content === b.content && a.design === b.design,
        handleSet: (handleSet) => throttleHistory(handleSet as (...args: unknown[]) => void),
      },
    ),
  );
}

export type DocumentStore<C> = ReturnType<typeof createDocumentStore<C>>;

const DocumentStoreContext = createContext<DocumentStore<unknown> | null>(null);

export function DocumentStoreProvider<C>({ store, children }: { store: DocumentStore<C>; children: ReactNode }) {
  const canUndo = useStore(store.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(store.temporal, (s) => s.futureStates.length > 0);
  const history = {
    canUndo,
    canRedo,
    undo: () => store.temporal.getState().undo(),
    redo: () => store.temporal.getState().redo(),
  };
  return (
    <DocumentStoreContext value={store as DocumentStore<unknown>}>
      <HistoryProvider value={history}>{children}</HistoryProvider>
    </DocumentStoreContext>
  );
}

export function useDocumentStoreApi<C>() {
  const store = use(DocumentStoreContext);
  if (!store) throw new Error("useDocumentStore must be used inside DocumentStoreProvider");
  return store as DocumentStore<C>;
}

export function useDocument<C, T>(selector: (state: DocumentStoreState<C>) => T): T {
  return useStore(useDocumentStoreApi<C>(), selector);
}

// ---------- Autosave ----------

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

const AUTOSAVE_DELAY_MS = 800;

function shallowChanged(a: Record<string, unknown>, b: Record<string, unknown>) {
  return Object.keys(a).some((key) => a[key] !== b[key]);
}

/**
 * Debounced, last-write-wins autosave of the slice `snapshot` picks from the store. `save` gets the new
 * snapshot and the last one that saved successfully, so it can send only what changed.
 */
export function useAutosave<T, S extends Record<string, unknown>>(
  store: Pick<StoreApi<T>, "getState" | "subscribe">,
  snapshot: (state: T) => S,
  save: (next: S, previous: S) => Promise<unknown>,
) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const saveRef = useRef(save);
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    saveRef.current = save;
    snapshotRef.current = snapshot;
  });
  const flushRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight: Promise<void> | null = null;
    let dirty = false;
    let saved = snapshotRef.current(store.getState());

    const flush = async (): Promise<void> => {
      clearTimeout(timer);
      timer = undefined;
      if (inFlight) {
        await inFlight;
        return dirty ? flush() : undefined;
      }
      if (!dirty) return;
      dirty = false;
      setStatus("saving");
      const next = snapshotRef.current(store.getState());
      inFlight = (async () => {
        try {
          await saveRef.current(next, saved);
          saved = next;
          setStatus(dirty ? "unsaved" : "saved");
        } catch (error) {
          dirty = true;
          setStatus("error");
          throw error;
        } finally {
          inFlight = null;
        }
      })();
      try {
        await inFlight;
      } finally {
        if (dirty && !timer) timer = setTimeout(() => void flush().catch(() => {}), AUTOSAVE_DELAY_MS * 2);
      }
    };
    flushRef.current = flush;

    const unsubscribe = store.subscribe((state, prev) => {
      if (!shallowChanged(snapshotRef.current(state), snapshotRef.current(prev))) return;
      dirty = true;
      setStatus("unsaved");
      clearTimeout(timer);
      timer = setTimeout(() => void flush().catch(() => {}), AUTOSAVE_DELAY_MS);
    });

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty || inFlight) {
        void flush().catch(() => {});
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Leaving the editor in-app: push any pending change right away.
      if (dirty) void flush().catch(() => {});
      clearTimeout(timer);
    };
  }, [store]);

  return { status, flush: () => flushRef.current() };
}
