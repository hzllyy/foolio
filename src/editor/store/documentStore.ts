import { create } from "zustand";
import type { Patch } from "immer";
import type { ProjectDocument } from "@/document/schema";
import type { EditorCommand } from "@/editor/commands/types";
import {
  canRedoTimeline,
  canUndoTimeline,
  createTimeline,
  dispatchTimelineCommand,
  endGesture as endTimelineGesture,
  redoTimeline,
  undoTimeline,
  type DispatchOptions,
  type EditorTimelineState,
} from "@/editor/history/timeline";

export type DocumentStore = {
  document: ProjectDocument;
  canUndo: boolean;
  canRedo: boolean;
  /** Applies a validated command. Pass `{ gestureId }` to coalesce repeated calls (e.g. one drag) into one history entry. */
  dispatch: (command: EditorCommand, options?: DispatchOptions) => void;
  /** Ends the active gesture (call on pointer-up) so the next dispatch starts a new history entry. */
  endGesture: () => void;
  undo: () => void;
  redo: () => void;
};

export type CreateDocumentStoreOptions = {
  /**
   * Called after every dispatch/undo/redo with the patches just applied (in the forward direction of
   * whichever operation ran) and the resulting document. Lets an external persistence adapter (e.g. the
   * guest Dexie adapter) observe changes without EditorShell/documentStore needing to know it exists.
   */
  onPatches?: (patches: Patch[], document: ProjectDocument) => void;
};

/** Creates an isolated document store instance wrapping the pure command + history + gesture-coalescing layers. */
export function createDocumentStore(
  initialDocument: ProjectDocument,
  options: CreateDocumentStoreOptions = {},
) {
  let timeline: EditorTimelineState = createTimeline(initialDocument);

  return create<DocumentStore>((set) => {
    const syncFromTimeline = () => ({
      document: timeline.document,
      canUndo: canUndoTimeline(timeline),
      canRedo: canRedoTimeline(timeline),
    });

    const notifyForwardPatches = () => {
      const entry = timeline.history.entries[timeline.history.index - 1];
      if (entry) options.onPatches?.(entry.patches, timeline.document);
    };

    const notifyInversePatches = () => {
      const entry = timeline.history.entries[timeline.history.index];
      if (entry) options.onPatches?.(entry.inversePatches, timeline.document);
    };

    return {
      document: timeline.document,
      canUndo: false,
      canRedo: false,
      dispatch: (command, dispatchOptions) => {
        timeline = dispatchTimelineCommand(timeline, command, dispatchOptions);
        set(syncFromTimeline());
        notifyForwardPatches();
      },
      endGesture: () => {
        timeline = endTimelineGesture(timeline);
      },
      undo: () => {
        timeline = undoTimeline(timeline);
        set(syncFromTimeline());
        notifyInversePatches();
      },
      redo: () => {
        timeline = redoTimeline(timeline);
        set(syncFromTimeline());
        notifyForwardPatches();
      },
    };
  });
}

export type UseDocumentStore = ReturnType<typeof createDocumentStore>;
