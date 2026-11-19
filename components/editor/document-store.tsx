"use client";

import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";
import { temporal } from "zundo";
import { useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { DocumentDesign } from "@/lib/documents/schema";

export type DocumentState<C> = { title: string; content: C; design: DocumentDesign };

type DocumentActions<C> = {
  setTitle: (title: string) => void;
  updateContent: (recipe: (draft: C) => void) => void;
  updateDesign: (recipe: (draft: DocumentDesign) => void) => void;
};

export type DocumentStoreState<C> = DocumentState<C> & DocumentActions<C>;

/** Typing bursts closer together than this collapse into a single undo step. */
const HISTORY_IDLE_MS = 600;

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
        handleSet: (handleSet) => {
          let lastChange = 0;
          const record = handleSet as (...args: unknown[]) => void;
          return (...args) => {
            const now = Date.now();
            if (now - lastChange > HISTORY_IDLE_MS) record(...args);
            lastChange = now;
          };
        },
      },
    ),
  );
}

export type DocumentStore<C> = ReturnType<typeof createDocumentStore<C>>;

const DocumentStoreContext = createContext<DocumentStore<unknown> | null>(null);

export function DocumentStoreProvider<C>({ store, children }: { store: DocumentStore<C>; children: ReactNode }) {
  return <DocumentStoreContext value={store as DocumentStore<unknown>}>{children}</DocumentStoreContext>;
}

export function useDocumentStoreApi<C>() {
  const store = use(DocumentStoreContext);
  if (!store) throw new Error("useDocumentStore must be used inside DocumentStoreProvider");
  return store as DocumentStore<C>;
}

export function useDocument<C, T>(selector: (state: DocumentStoreState<C>) => T): T {
  return useStore(useDocumentStoreApi<C>(), selector);
}

export function useHistory() {
  const store = useDocumentStoreApi();
  const canUndo = useStore(store.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(store.temporal, (s) => s.futureStates.length > 0);
  return { canUndo, canRedo, undo: () => store.temporal.getState().undo(), redo: () => store.temporal.getState().redo() };
}

// ---------- Autosave ----------

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

const AUTOSAVE_DELAY_MS = 800;

export function useAutosave<C>(
  store: StoreApi<DocumentStoreState<C>>,
  save: (state: DocumentState<C>) => Promise<unknown>,
) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  const flushRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight: Promise<void> | null = null;
    let dirty = false;

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
      const { title, content, design } = store.getState();
      inFlight = (async () => {
        try {
          await saveRef.current({ title, content, design });
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
      if (state.title === prev.title && state.content === prev.content && state.design === prev.design) return;
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
