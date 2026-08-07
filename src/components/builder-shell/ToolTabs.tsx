"use client";

import { useMemo } from "react";
import { useEditorStores, useSessionState } from "./EditorShell";
import styles from "./ToolTabs.module.css";

const TAB_DEFS = [
  { id: "select", label: "Select", iconClass: styles.selectIcon },
  { id: "shape", label: "Shape", iconClass: styles.shapeIcon },
  { id: "text", label: "Text", iconClass: styles.textIcon },
  { id: "upload", label: "Upload", iconClass: styles.uploadIcon },
  { id: "polygon", label: "Pentagon", iconClass: styles.pentagonIcon },
  { id: "pen", label: "Pen", iconClass: styles.penIcon },
] as const;

export function ToolTabs() {
  const { sessionStore } = useEditorStores();
  const activeTool = useSessionState((state) => state.activeTool);

  const tabs = useMemo(() => TAB_DEFS, []);

  return (
    <div className={styles.tabs} role="tablist" aria-label="Tools">
      {tabs.map((tab) => {
        const selected = activeTool === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={[styles.tab, selected && styles.selected].filter(Boolean).join(" ")}
            onClick={() => sessionStore.getState().setActiveTool(tab.id)}
            title={tab.label}
          >
            <span className={[styles.icon, tab.iconClass].join(" ")} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
