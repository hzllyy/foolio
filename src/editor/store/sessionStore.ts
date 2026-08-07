import { create } from "zustand";
import type { ViewportName } from "@/document/schema";
import type { EditorMode } from "@/components/design-system";
import type { ToolId } from "@/editor/tools/types";

export type { EditorMode };

const MIN_ZOOM_PERCENT = 10;
const MAX_ZOOM_PERCENT = 800;

export type SessionState = {
  activePageId: string;
  viewport: ViewportName;
  mode: EditorMode;
  activeTool: ToolId;
  selectedElementIds: string[];
  hoverElementId: string | null;
  zoomPercent: number;
  playheadOffsetPx: number;
};

export type SessionStore = SessionState & {
  setActivePageId: (pageId: string) => void;
  setViewport: (viewport: ViewportName) => void;
  setMode: (mode: EditorMode) => void;
  /** Switching tools always clears any in-progress selection/hover so a half-finished operation can't leak across tools. */
  setActiveTool: (tool: ToolId) => void;
  selectOnly: (elementId: string | null) => void;
  toggleSelect: (elementId: string) => void;
  selectMany: (elementIds: string[]) => void;
  clearSelection: () => void;
  setHoverElementId: (elementId: string | null) => void;
  setZoomPercent: (zoomPercent: number) => void;
  setPlayheadOffsetPx: (offsetPx: number) => void;
};

export type CreateSessionStoreOptions = {
  activePageId: string;
  viewport?: ViewportName;
  mode?: EditorMode;
  activeTool?: ToolId;
  zoomPercent?: number;
  playheadOffsetPx?: number;
};

function clampZoom(zoomPercent: number): number {
  return Math.min(MAX_ZOOM_PERCENT, Math.max(MIN_ZOOM_PERCENT, zoomPercent));
}

/** Creates an isolated session store instance for ephemeral, non-undoable editor state (ADR-008). */
export function createSessionStore(options: CreateSessionStoreOptions) {
  return create<SessionStore>((set) => ({
    activePageId: options.activePageId,
    viewport: options.viewport ?? "desktop",
    mode: options.mode ?? "edit",
    activeTool: options.activeTool ?? "select",
    selectedElementIds: [],
    hoverElementId: null,
    zoomPercent: clampZoom(options.zoomPercent ?? 100),
    playheadOffsetPx: Math.max(0, options.playheadOffsetPx ?? 0),

    setActivePageId: (pageId) =>
      set({ activePageId: pageId, selectedElementIds: [], hoverElementId: null }),
    setViewport: (viewport) => set({ viewport }),
    setMode: (mode) => set({ mode }),
    setActiveTool: (tool) =>
      set({ activeTool: tool, selectedElementIds: [], hoverElementId: null }),
    selectOnly: (elementId) => set({ selectedElementIds: elementId ? [elementId] : [] }),
    toggleSelect: (elementId) =>
      set((state) => ({
        selectedElementIds: state.selectedElementIds.includes(elementId)
          ? state.selectedElementIds.filter((id) => id !== elementId)
          : [...state.selectedElementIds, elementId],
      })),
    selectMany: (elementIds) => set({ selectedElementIds: elementIds }),
    clearSelection: () => set({ selectedElementIds: [] }),
    setHoverElementId: (elementId) => set({ hoverElementId: elementId }),
    setZoomPercent: (zoomPercent) => set({ zoomPercent: clampZoom(zoomPercent) }),
    setPlayheadOffsetPx: (offsetPx) => set({ playheadOffsetPx: Math.max(0, offsetPx) }),
  }));
}

export type UseSessionStore = ReturnType<typeof createSessionStore>;
