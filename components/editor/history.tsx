"use client";

import { createContext, use, type ReactNode } from "react";

/** Undo/redo for whichever document the editor has open. */
export type EditorHistory = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const HistoryContext = createContext<EditorHistory | null>(null);

export function HistoryProvider({ value, children }: { value: EditorHistory; children: ReactNode }) {
  return <HistoryContext value={value}>{children}</HistoryContext>;
}

export function useEditorHistory() {
  const history = use(HistoryContext);
  if (!history) throw new Error("useEditorHistory must be used inside an editor store provider");
  return history;
}

/** Typing bursts closer together than this collapse into a single undo step. */
export const HISTORY_IDLE_MS = 600;

/** zundo `handleSet` that only records the state from before a burst of edits. */
export function throttleHistory<A extends unknown[]>(record: (...args: A) => void) {
  let lastChange = 0;
  return (...args: A) => {
    const now = Date.now();
    if (now - lastChange > HISTORY_IDLE_MS) record(...args);
    lastChange = now;
  };
}
