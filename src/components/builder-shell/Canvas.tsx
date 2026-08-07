"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { SceneRenderer } from "@/renderer/scene/SceneRenderer";
import { AssetResolverProvider } from "@/renderer/scene/AssetResolver";
import {
  createDefaultPolygonElement,
  createDefaultShapeElement,
  createDefaultTextElement,
  createImageElement,
  createPenElement,
} from "@/editor/tools/factories";
import { validateUpload } from "@/editor/tools/upload";
import { useEditorStores, useDocumentState, useSessionState } from "./EditorShell";
import { useSelectTool } from "./useSelectTool";
import styles from "./Canvas.module.css";

const NUDGE_STEP_PX = 1;
const NUDGE_STEP_LARGE_PX = 10;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

/** Editor-mode canvas: renders the page, and wires the active tool's pointer/keyboard behavior. */
export function Canvas() {
  const { documentStore, sessionStore, assetUrls } = useEditorStores();
  const activeDocument = useDocumentState((state) => state.document);
  const activePageId = useSessionState((state) => state.activePageId);
  const viewport = useSessionState((state) => state.viewport);
  const mode = useSessionState((state) => state.mode);
  const playheadOffsetPx = useSessionState((state) => state.playheadOffsetPx);
  const zoomPercent = useSessionState((state) => state.zoomPercent);
  const activeTool = useSessionState((state) => state.activeTool);
  const selectedElementIds = useSessionState((state) => state.selectedElementIds);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadPointRef = useRef<{ x: number; y: number } | null>(null);
  const penPointsRef = useRef<[number, number][] | null>(null);
  const lastAutoFitKeyRef = useRef<string | null>(null);
  const [isDrawingPen, setIsDrawingPen] = useState(false);

  const page = activeDocument.pages[activePageId];
  const rootElementIds = page?.rootElementIds ?? [];

  // Undo/redo can remove elements that are currently selected (e.g. undoing a create); prune any
  // dangling ids so selection-derived UI (status text, Inspector, Moveable's target) stays in sync.
  useEffect(() => {
    const validIds = selectedElementIds.filter((id) => activeDocument.elements[id]);
    if (validIds.length !== selectedElementIds.length) {
      sessionStore.getState().selectMany(validIds);
    }
  }, [activeDocument.elements, selectedElementIds, sessionStore]);

  useSelectTool({
    stageRef,
    rootElementIds,
    viewport,
    documentStore,
    sessionStore,
    zoomPercent,
    enabled: activeTool === "select" && !!page,
  });

  const resolveAssetUrl = useCallback((assetId: string) => assetUrls.get(assetId), [assetUrls]);

  const stagePointFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const stage = stageRef.current;
      if (!stage) return { x: 0, y: 0 };
      const rect = stage.getBoundingClientRect();
      const scale = zoomPercent / 100;
      return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
    },
    [zoomPercent],
  );

  const createElementAt = useCallback(
    (x: number, y: number) => {
      if (!page) return;
      const id = crypto.randomUUID();
      const at = { id, pageId: page.id, parentId: null, x, y };
      const payload =
        activeTool === "shape"
          ? createDefaultShapeElement(at)
          : activeTool === "text"
            ? createDefaultTextElement(at)
            : activeTool === "polygon"
              ? createDefaultPolygonElement(at)
              : null;
      if (!payload) return;
      documentStore.getState().dispatch({ type: "element.create", payload });
      sessionStore.getState().setActiveTool("select");
      sessionStore.getState().selectOnly(id);
    },
    [activeTool, documentStore, page, sessionStore],
  );

  const handleUploadFileChosen = useCallback(
    (file: File) => {
      if (!page) return;
      const assetCount = activeDocument.assetIds.length;
      const validation = validateUpload(file, assetCount);
      if (!validation.ok) {
        window.alert(validation.reason);
        return;
      }
      const point = pendingUploadPointRef.current ?? { x: 0, y: 0 };
      const objectUrl = URL.createObjectURL(file);
      const assetId = `asset-${crypto.randomUUID()}`;

      const image = new Image();
      image.onload = () => {
        assetUrls.set(assetId, objectUrl);
        const maxWidth = 320;
        const scale = image.naturalWidth > maxWidth ? maxWidth / image.naturalWidth : 1;
        const id = crypto.randomUUID();
        documentStore.getState().dispatch({
          type: "element.create",
          payload: createImageElement({
            id,
            pageId: page.id,
            parentId: null,
            x: point.x,
            y: point.y,
            assetId,
            alt: file.name,
            widthPx: Math.round(image.naturalWidth * scale),
            heightPx: Math.round(image.naturalHeight * scale),
          }),
        });
        sessionStore.getState().setActiveTool("select");
        sessionStore.getState().selectOnly(id);
      };
      image.src = objectUrl;
    },
    [assetUrls, activeDocument.assetIds.length, documentStore, page, sessionStore],
  );

  // Only the Pen tool needs to react to pointerdown/move (to track a freehand stroke while the
  // button is held); every other tool commits on the trailing `click` event instead (see below).
  const handleStagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activeTool !== "pen") return;
      const point = stagePointFromEvent(event.clientX, event.clientY);
      setIsDrawingPen(true);
      penPointsRef.current = [[point.x, point.y]];
    },
    [activeTool, stagePointFromEvent],
  );

  const handleStagePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activeTool !== "pen" || !isDrawingPen || !penPointsRef.current) return;
      const point = stagePointFromEvent(event.clientX, event.clientY);
      const last = penPointsRef.current[penPointsRef.current.length - 1]!;
      const distance = Math.hypot(point.x - last[0], point.y - last[1]);
      if (distance >= 4) penPointsRef.current.push([point.x, point.y]);
    },
    [activeTool, isDrawingPen, stagePointFromEvent],
  );

  const handleStagePointerUp = useCallback(() => {
    if (activeTool !== "pen" || !isDrawingPen) return;
    setIsDrawingPen(false);
  }, [activeTool, isDrawingPen]);

  // Commits the active tool's action on `click` (the trailing event of a pointerdown/up gesture),
  // never on `pointerdown` — switching to the Select tool mid-gesture would let a freshly-mounted
  // Selecto instance intercept this same gesture's `click` and re-select whatever is underneath it.
  const handleStageClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!page) return;
      const point = stagePointFromEvent(event.clientX, event.clientY);

      if (activeTool === "upload") {
        pendingUploadPointRef.current = point;
        fileInputRef.current?.click();
        return;
      }

      if (activeTool === "pen") {
        const points = penPointsRef.current;
        penPointsRef.current = null;
        if (!points || points.length < 2) return;

        const minX = Math.min(...points.map(([x]) => x));
        const minY = Math.min(...points.map(([, y]) => y));
        const relativePoints: [number, number][] = points.map(([x, y]) => [x - minX, y - minY]);
        const svgPath = relativePoints
          .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`)
          .join(" ");

        const id = crypto.randomUUID();
        documentStore.getState().dispatch({
          type: "element.create",
          payload: createPenElement({
            id,
            pageId: page.id,
            parentId: null,
            x: minX,
            y: minY,
            points: relativePoints,
            svgPath,
          }),
        });
        sessionStore.getState().setActiveTool("select");
        sessionStore.getState().selectOnly(id);
        return;
      }

      if (activeTool === "shape" || activeTool === "text" || activeTool === "polygon") {
        createElementAt(point.x, point.y);
      }
    },
    [activeTool, createElementAt, documentStore, page, sessionStore, stagePointFromEvent],
  );

  // Keyboard shortcuts: undo/redo, delete selection, and arrow-key nudging (zoom-independent, in document units).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
      const isMeta = event.metaKey || event.ctrlKey;

      if (isMeta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) documentStore.getState().redo();
        else documentStore.getState().undo();
        return;
      }
      if (isMeta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        documentStore.getState().redo();
        return;
      }

      const ids = sessionStore.getState().selectedElementIds;
      if (ids.length === 0) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        for (const elementId of ids) {
          documentStore.getState().dispatch({ type: "element.delete", payload: { elementId } });
        }
        sessionStore.getState().clearSelection();
        return;
      }

      const nudge = event.shiftKey ? NUDGE_STEP_LARGE_PX : NUDGE_STEP_PX;
      const deltas: Record<string, [number, number]> = {
        ArrowUp: [0, -nudge],
        ArrowDown: [0, nudge],
        ArrowLeft: [-nudge, 0],
        ArrowRight: [nudge, 0],
      };
      const delta = deltas[event.key];
      if (!delta) return;
      event.preventDefault();

      const currentDocument = documentStore.getState().document;
      for (const elementId of ids) {
        const element = currentDocument.elements[elementId];
        if (!element) continue;
        const resolved =
          viewport === "mobile"
            ? { ...element.base, ...element.viewportOverrides.mobile }
            : element.base;
        const fields = { x: resolved.x + delta[0], y: resolved.y + delta[1] };
        documentStore.getState().dispatch({
          type: "element.patch",
          payload: {
            elementId,
            ...(viewport === "mobile" ? { mobileOverride: fields } : { base: fields }),
          },
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [documentStore, sessionStore, viewport]);

  // Auto-fit on first load of a page+viewport combo so all corners are visible without scrolling.
  useEffect(() => {
    if (!page) return;
    const viewportElement = viewportRef.current;
    if (!viewportElement) return;
    const targetViewport = page.viewports[viewport];

    const fitKey = `${page.id}:${viewport}`;
    if (lastAutoFitKeyRef.current === fitKey) return;

    const frameId = window.requestAnimationFrame(() => {
      const style = window.getComputedStyle(viewportElement);
      const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const availableWidth = viewportElement.clientWidth - paddingX;
      const availableHeight = viewportElement.clientHeight - paddingY;

      if (availableWidth <= 0 || availableHeight <= 0) return;

      const fitScale = Math.min(
        availableWidth / targetViewport.widthPx,
        availableHeight / targetViewport.viewportHeightPx,
      );
      const nextZoomPercent = Math.max(10, Math.floor(fitScale * 100));

      lastAutoFitKeyRef.current = fitKey;
      sessionStore.getState().setZoomPercent(nextZoomPercent);
      viewportElement.scrollTop = 0;
      viewportElement.scrollLeft = 0;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [page, sessionStore, viewport]);

  if (!page) {
    return (
      <div className={styles.canvas} role="alert">
        Active page not found
      </div>
    );
  }

  const pageViewport = page.viewports[viewport];
  const sceneScrollOffsetPx = mode === "animate" ? playheadOffsetPx : 0;

  const scale = zoomPercent / 100;

  return (
    <div className={styles.canvas}>
      <div ref={viewportRef} className={styles.viewport}>
        <div className={styles.viewportInner}>
          <div
            className={styles.zoomWrapper}
            style={{
              transform: `scale(${scale})`,
              width: pageViewport.widthPx,
              height: pageViewport.viewportHeightPx,
            }}
          >
            <div
              ref={stageRef}
              data-testid="canvas-stage"
              className={activeTool === "pen" ? `${styles.stage} ${styles.penCursor}` : styles.stage}
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerUp}
              onClick={handleStageClick}
            >
              <AssetResolverProvider value={resolveAssetUrl}>
                <SceneRenderer
                  document={activeDocument}
                  pageId={page.id}
                  viewport={viewport}
                  scrollOffsetPx={sceneScrollOffsetPx}
                  mode="editor"
                />
              </AssetResolverProvider>
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className={styles.hiddenFileInput}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) handleUploadFileChosen(file);
        }}
      />

      <p className={styles.statusText}>
        {selectedElementIds.length === 0
          ? "Nothing selected"
          : `${selectedElementIds.length} element${selectedElementIds.length === 1 ? "" : "s"} selected`}
      </p>
    </div>
  );
}
