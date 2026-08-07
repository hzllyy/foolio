import { applyPatches } from "immer";
import type { Patch } from "immer";
import type { ProjectDocument } from "@/document/schema";

export type HistoryEntry = {
  patches: Patch[];
  inversePatches: Patch[];
  /** Present when this entry was created (or last updated) as part of a coalesced pointer gesture. */
  gestureId?: string;
};

export type HistoryState = {
  entries: HistoryEntry[];
  /** Number of entries currently applied; entries[index..] are redo-able. */
  index: number;
};

export const emptyHistoryState: HistoryState = { entries: [], index: 0 };

/** Appends a new entry, discarding any redo-able entries beyond the current index. */
export function pushHistoryEntry(history: HistoryState, entry: HistoryEntry): HistoryState {
  const entries = [...history.entries.slice(0, history.index), entry];
  return { entries, index: entries.length };
}

/** Replaces the most recently applied entry in place (used to coalesce a pointer gesture). */
export function replaceTopHistoryEntry(history: HistoryState, entry: HistoryEntry): HistoryState {
  if (history.index === 0) {
    throw new Error("Cannot replace the top history entry when history is empty");
  }
  const entries = [...history.entries];
  entries[history.index - 1] = entry;
  return { entries, index: history.index };
}

export function canUndo(history: HistoryState): boolean {
  return history.index > 0;
}

export function canRedo(history: HistoryState): boolean {
  return history.index < history.entries.length;
}

export function undoHistory(
  document: ProjectDocument,
  history: HistoryState,
): { document: ProjectDocument; history: HistoryState } {
  if (!canUndo(history)) return { document, history };
  const entry = history.entries[history.index - 1]!;
  return {
    document: applyPatches(document, entry.inversePatches),
    history: { ...history, index: history.index - 1 },
  };
}

export function redoHistory(
  document: ProjectDocument,
  history: HistoryState,
): { document: ProjectDocument; history: HistoryState } {
  if (!canRedo(history)) return { document, history };
  const entry = history.entries[history.index]!;
  return {
    document: applyPatches(document, entry.patches),
    history: { ...history, index: history.index + 1 },
  };
}
