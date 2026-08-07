"use client";

import { Pages } from "./Pages";
import { Layers } from "./Layers";
import { AnimateSidebar } from "./AnimateSidebar";
import { useSessionState } from "./EditorShell";
import styles from "./Sidebar.module.css";

/** Left sidebar: page list on top, active page's layer tree below. */
export function Sidebar() {
  const mode = useSessionState((state) => state.mode);

  return (
    <div className={styles.sidebar}>
      {mode === "animate" ? (
        <AnimateSidebar />
      ) : (
        <>
          <Layers />
          <Pages />
        </>
      )}
    </div>
  );
}
