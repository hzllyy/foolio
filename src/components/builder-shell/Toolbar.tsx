"use client";

import type { ToolId } from "@/editor/tools/types";
import { Button } from "@/components/design-system";
import { useEditorStores, useSessionState } from "./EditorShell";
import styles from "./Toolbar.module.css";

const TOOLS: { id: ToolId; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "shape", label: "Shape" },
  { id: "text", label: "Text" },
  { id: "upload", label: "Upload" },
  { id: "polygon", label: "Polygon" },
  { id: "pen", label: "Pen" },
];

/** Left tool rail: Select plus the Shape/Text/Upload/Polygon/Pen creation tools. */
export function Toolbar() {
  const { sessionStore } = useEditorStores();
  const activeTool = useSessionState((state) => state.activeTool);

  return (
    <nav className={styles.toolbar} aria-label="Tools">
      {TOOLS.map((tool) => (
        <Button
          key={tool.id}
          kind="tertiary"
          emphasis={activeTool === tool.id ? "solid" : "outline"}
          aria-pressed={activeTool === tool.id}
          aria-label={tool.label}
          className={styles.toolButton}
          onClick={() => sessionStore.getState().setActiveTool(tool.id)}
        >
          {tool.label}
        </Button>
      ))}
    </nav>
  );
}
