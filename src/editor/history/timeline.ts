import type { ProjectDocument } from "@/document/schema";
import { applyCommand } from "@/editor/commands/apply";
import type { EditorCommand } from "@/editor/commands/types";
import {
  canRedo,
  canUndo,
  emptyHistoryState,
  pushHistoryEntry,
  redoHistory,
  replaceTopHistoryEntry,
  undoHistory,
  type HistoryState,
} from "./stack";

export type DispatchOptions = {
  /**
   * Identifies a single continuous pointer gesture (e.g. one drag). Repeated dispatches with the
   * same `gestureId` recompute patches from the gesture's starting document and replace the top
   * history entry, so the whole gesture undoes/redoes as a single step.
   */
  gestureId?: string;
};

export type EditorTimelineState = {
  document: ProjectDocument;
  history: HistoryState;
  gesture: { id: string; baseDocument: ProjectDocument } | null;
};

export function createTimeline(document: ProjectDocument): EditorTimelineState {
  return { document, history: emptyHistoryState, gesture: null };
}

/** Applies a command to the timeline, coalescing it into the active gesture's history entry when applicable. */
export function dispatchTimelineCommand(
  state: EditorTimelineState,
  command: EditorCommand,
  options: DispatchOptions = {},
): EditorTimelineState {
  const { gestureId } = options;

  if (gestureId && state.gesture && state.gesture.id === gestureId) {
    const { document, patches, inversePatches } = applyCommand(state.gesture.baseDocument, command);
    return {
      document,
      history: replaceTopHistoryEntry(state.history, { patches, inversePatches, gestureId }),
      gesture: state.gesture,
    };
  }

  const { document, patches, inversePatches } = applyCommand(state.document, command);
  const history = pushHistoryEntry(state.history, { patches, inversePatches, gestureId });
  const gesture = gestureId ? { id: gestureId, baseDocument: state.document } : null;
  return { document, history, gesture };
}

/** Ends the active gesture (call on pointer-up) so the next dispatch starts a new history entry. */
export function endGesture(state: EditorTimelineState): EditorTimelineState {
  return state.gesture ? { ...state, gesture: null } : state;
}

export function undoTimeline(state: EditorTimelineState): EditorTimelineState {
  const { document, history } = undoHistory(state.document, state.history);
  return { document, history, gesture: null };
}

export function redoTimeline(state: EditorTimelineState): EditorTimelineState {
  const { document, history } = redoHistory(state.document, state.history);
  return { document, history, gesture: null };
}

export function canUndoTimeline(state: EditorTimelineState): boolean {
  return canUndo(state.history);
}

export function canRedoTimeline(state: EditorTimelineState): boolean {
  return canRedo(state.history);
}
