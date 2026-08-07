"use client";

import { useDocumentState, useSessionState } from "./EditorShell";
import styles from "./AnimateSidebar.module.css";

/** Animate-mode sidebar state: page range, playhead, and track target summary. */
export function AnimateSidebar() {
  const document = useDocumentState((state) => state.document);
  const activePageId = useSessionState((state) => state.activePageId);
  const viewport = useSessionState((state) => state.viewport);
  const playheadOffsetPx = useSessionState((state) => state.playheadOffsetPx);
  const selectedElementIds = useSessionState((state) => state.selectedElementIds);

  const page = document.pages[activePageId];
  const selectedElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : undefined;
  const selectedElement = selectedElementId ? document.elements[selectedElementId] : undefined;

  if (!page) {
    return <section className={styles.sidebar} aria-label="Animate sidebar" />;
  }

  const maxOffsetPx = page.viewports[viewport].scrollLengthPx;

  return (
    <section className={styles.sidebar} aria-label="Animate sidebar">
      <h2 className={styles.heading}>Animation</h2>
      <p className={styles.detail}>Range: 0 - {Math.round(maxOffsetPx)}px</p>
      <p className={styles.detail}>Playhead: {Math.round(playheadOffsetPx)}px</p>
      <p className={styles.detail}>
        Target: {selectedElement ? selectedElement.name : "Select one element"}
      </p>
    </section>
  );
}
