"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { Patch } from "immer";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ProjectDocument } from "@/document/schema";
import {
  createDocumentStore,
  type DocumentStore,
  type UseDocumentStore,
} from "@/editor/store/documentStore";
import {
  createSessionStore,
  type SessionStore,
  type UseSessionStore,
} from "@/editor/store/sessionStore";
import { Menubar } from "./Menubar";
import { ToolTabs } from "./ToolTabs";
import { Sidebar } from "./Sidebar";
import { Canvas } from "./Canvas";
import { Inspector } from "./Inspector";
import { CanvasTopbar } from "./CanvasTopbar";
import { TimelinePanel } from "@/components/timeline";
import styles from "./EditorShell.module.css";

type EditorStores = {
  documentStore: UseDocumentStore;
  sessionStore: UseSessionStore;
  /** In-memory asset registry (object URLs) shared by the Upload tool and the renderer's AssetResolver. */
  assetUrls: Map<string, string>;
};

const EditorStoresContext = createContext<EditorStores | null>(null);

/** Exposed for test harnesses that need to mount a single panel (e.g. Layers/Pages) without the full shell. */
export const EditorStoresProvider = EditorStoresContext.Provider;

export function useEditorStores(): EditorStores {
  const stores = useContext(EditorStoresContext);
  if (!stores) throw new Error("useEditorStores must be used within an <EditorShell>");
  return stores;
}

export function useDocumentState<T>(selector: (state: DocumentStore) => T): T {
  const { documentStore } = useEditorStores();
  return documentStore(selector);
}

export function useSessionState<T>(selector: (state: SessionStore) => T): T {
  const { sessionStore } = useEditorStores();
  return sessionStore(selector);
}

export type EditorShellProps = {
  initialDocument: ProjectDocument;
  initialPageId: string;
  /** Observes patches from every dispatch/undo/redo, e.g. to drive an external persistence adapter. */
  onDocumentPatches?: (patches: Patch[], document: ProjectDocument) => void;
};

/** Top-level editor chrome: menubar, edit/animate switch, toolbar, canvas, and inspector sidebar. */
export function EditorShell({
  initialDocument,
  initialPageId,
  onDocumentPatches,
}: EditorShellProps) {
  const [stores] = useState<EditorStores>(() => ({
    documentStore: createDocumentStore(initialDocument, { onPatches: onDocumentPatches }),
    sessionStore: createSessionStore({ activePageId: initialPageId }),
    assetUrls: new Map(),
  }));

  const projectName = stores.documentStore((state) => state.document.name);
  const mode = stores.sessionStore((state) => state.mode);
  const [inspectorHeightPx, setInspectorHeightPx] = useState(280);
  const sidebarColumnRef = useRef<HTMLDivElement | null>(null);
  const projectSectionRef = useRef<HTMLElement | null>(null);

  const beginInspectorResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const sidebarColumn = sidebarColumnRef.current;
    if (!sidebarColumn) return;

    const sidebarRect = sidebarColumn.getBoundingClientRect();
    const projectHeight = projectSectionRef.current?.getBoundingClientRect().height ?? 0;
    const minInspector = 160;
    const minSidebar = 180;
    const maxInspector = Math.max(minInspector, sidebarRect.height - projectHeight - minSidebar);

    const pointerId = event.pointerId;
    const startY = event.clientY;
    const startHeight = inspectorHeightPx;

    event.currentTarget.setPointerCapture(pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const nextHeight = Math.max(minInspector, Math.min(startHeight + deltaY, maxInspector));
      setInspectorHeightPx(nextHeight);
    };

    const stopResize = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }, [inspectorHeightPx]);

  return (
    <EditorStoresContext.Provider value={stores}>
      <div className={styles.shell}>
        <Menubar />
        <div className={styles.workspace}>
          <div className={styles.sidebarColumn} ref={sidebarColumnRef}>
            <section className={styles.projectSection} aria-label="Project" ref={projectSectionRef}>
              <p className={styles.projectLabel}>project</p>
              <h1 className={styles.projectName}>{projectName}</h1>
            </section>
            <div className={styles.inspectorPane} style={{ height: `${inspectorHeightPx}px` }}>
              <Inspector />
            </div>
            <div
              className={styles.inspectorResizeHandle}
              role="separator"
              aria-label="Resize inspector and layers"
              aria-orientation="horizontal"
              onPointerDown={beginInspectorResize}
            />
            <Sidebar />
          </div>
          <div className={styles.canvasColumn}>
            <CanvasTopbar />
            <Canvas />
            {mode === "edit" ? <ToolTabs /> : <TimelinePanel />}
          </div>
        </div>
      </div>
    </EditorStoresContext.Provider>
  );
}
