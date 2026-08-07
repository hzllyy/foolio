"use client";

import { SegmentedControl } from "@/components/design-system";
import { useDocumentState, useEditorStores, useSessionState } from "./EditorShell";
import styles from "./CanvasTopbar.module.css";

/** Mode and history controls shown above the canvas viewport. */
export function CanvasTopbar() {
  const { documentStore, sessionStore } = useEditorStores();
  const canUndo = useDocumentState((state) => state.canUndo);
  const canRedo = useDocumentState((state) => state.canRedo);
  const mode = useSessionState((state) => state.mode);

  return (
    <div className={styles.topbar}>
      <SegmentedControl value={mode} onChange={(next) => sessionStore.getState().setMode(next)} />
      <div className={styles.historyControls}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Undo"
          disabled={!canUndo}
          onClick={() => documentStore.getState().undo()}
        >
          <span className={`${styles.icon} ${styles.undoIcon}`} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Redo"
          disabled={!canRedo}
          onClick={() => documentStore.getState().redo()}
        >
          <span className={`${styles.icon} ${styles.redoIcon}`} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}