"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import Moveable from "moveable";
import Selecto from "selecto";
import type { ElementStyle, ViewportName } from "@/document/schema";
import { resolveElementStyle } from "@/document/geometry";
import type { UseDocumentStore } from "@/editor/store/documentStore";
import type { UseSessionStore } from "@/editor/store/sessionStore";

export type UseSelectToolOptions = {
  stageRef: RefObject<HTMLDivElement | null>;
  rootElementIds: string[];
  viewport: ViewportName;
  documentStore: UseDocumentStore;
  sessionStore: UseSessionStore;
  zoomPercent: number;
  enabled: boolean;
};

type StyleFields = Partial<Pick<ElementStyle, "x" | "y" | "width" | "height" | "rotationDeg">>;

function styleFieldsFor(viewport: ViewportName, fields: StyleFields) {
  return viewport === "mobile" ? { mobileOverride: fields } : { base: fields };
}

/**
 * Wires Selecto (click/marquee select) and Moveable (drag/resize/rotate) onto the already-rendered
 * root-level element DOM nodes, dispatching gesture-coalesced `element.patch` commands so a whole
 * drag/resize/rotate undoes as a single step. See docs/decisions.md ADR-003.
 */
export function useSelectTool({
  stageRef,
  rootElementIds,
  viewport,
  documentStore,
  sessionStore,
  zoomPercent,
  enabled,
}: UseSelectToolOptions) {
  useEffect(() => {
    if (!enabled) return;
    const stage = stageRef.current;
    if (!stage) return;

    const selectableTargets = rootElementIds
      .map((id) => stage.querySelector<HTMLElement>(`[data-element-id="${id}"]`))
      .filter((element): element is HTMLElement => element !== null);

    if (selectableTargets.length === 0) return;

    const moveable = new Moveable(stage, {
      draggable: true,
      resizable: true,
      rotatable: true,
      keepRatio: false,
      origin: false,
      zoom: zoomPercent / 100,
    });

    const selecto = new Selecto({
      container: stage,
      selectableTargets,
      selectByClick: true,
      selectFromInside: false,
      toggleContinueSelect: ["shift"],
      hitRate: 0,
    });

    function applySelectionToMoveable() {
      const ids = sessionStore.getState().selectedElementIds;
      const target =
        ids.length === 1
          ? (selectableTargets.find((el) => el.dataset.elementId === ids[0]) ?? null)
          : null;
      moveable.target = target;
    }
    applySelectionToMoveable();
    const unsubscribe = sessionStore.subscribe((state, prev) => {
      if (state.selectedElementIds !== prev.selectedElementIds) applySelectionToMoveable();
    });

    selecto.on("dragStart", (e) => {
      const inputTarget = e.inputEvent.target as HTMLElement;
      if (moveable.isMoveableElement(inputTarget)) {
        e.stop();
      }
    });

    selecto.on("selectEnd", (e) => {
      const ids = e.selected
        .map((el) => (el as HTMLElement).dataset.elementId)
        .filter((id): id is string => Boolean(id));
      sessionStore.getState().selectMany(ids);

      // Only hand off to Moveable if this gesture actually started on the (now-selected) target's
      // controls — otherwise any unrelated click elsewhere on the page (e.g. a toolbar button) that
      // Selecto reports as `isDragStart` would spuriously start (and immediately end) a drag on
      // whatever Moveable's target still is, dispatching a bogus `element.patch`.
      const inputTarget = e.inputEvent.target as HTMLElement;
      if (e.isDragStart && moveable.isMoveableElement(inputTarget)) {
        e.inputEvent.preventDefault();
        moveable.forceUpdate(() => {
          moveable.dragStart(e.inputEvent);
        });
      }
    });

    let gestureId: string | null = null;
    let gestureStartStyle: ReturnType<typeof resolveElementStyle> | null = null;

    function beginGesture(target: HTMLElement | SVGElement): string | undefined {
      const elementId = (target as HTMLElement).dataset.elementId;
      if (!elementId) return undefined;
      const element = documentStore.getState().document.elements[elementId];
      if (!element || element.locked) return undefined;
      gestureId = `${elementId}-${Date.now()}`;
      gestureStartStyle = resolveElementStyle(element, viewport);
      return elementId;
    }

    function endGesture() {
      documentStore.getState().endGesture();
      gestureId = null;
      gestureStartStyle = null;
    }

    moveable
      .on("dragStart", ({ target }) => {
        beginGesture(target);
      })
      .on("drag", ({ target, translate }) => {
        const elementId = (target as HTMLElement).dataset.elementId;
        if (!elementId || !gestureId || !gestureStartStyle) return;
        documentStore.getState().dispatch(
          {
            type: "element.patch",
            payload: {
              elementId,
              ...styleFieldsFor(viewport, {
                x: gestureStartStyle.x + translate[0]!,
                y: gestureStartStyle.y + translate[1]!,
              }),
            },
          },
          { gestureId },
        );
      })
      .on("dragEnd", endGesture)
      .on("resizeStart", ({ target }) => {
        beginGesture(target);
      })
      .on("resize", ({ target, width, height, direction }) => {
        const elementId = (target as HTMLElement).dataset.elementId;
        if (!elementId || !gestureId || !gestureStartStyle) return;
        if (!Array.isArray(direction) || direction.length < 2) return;
        if (!Number.isFinite(width) || !Number.isFinite(height)) return;
        if (width <= 0 || height <= 0) return;

        const dirX = direction[0] ?? 0;
        const dirY = direction[1] ?? 0;
        const startRight = gestureStartStyle.x + gestureStartStyle.width;
        const startBottom = gestureStartStyle.y + gestureStartStyle.height;
        const nextX = dirX === -1 ? startRight - width : gestureStartStyle.x;
        const nextY = dirY === -1 ? startBottom - height : gestureStartStyle.y;

        documentStore.getState().dispatch(
          {
            type: "element.patch",
            payload: {
              elementId,
              ...styleFieldsFor(viewport, {
                x: nextX,
                y: nextY,
                width,
                height,
              }),
            },
          },
          { gestureId },
        );
      })
      .on("resizeEnd", endGesture)
      .on("rotateStart", ({ target }) => {
        beginGesture(target);
      })
      .on("rotate", ({ target, rotation }) => {
        const elementId = (target as HTMLElement).dataset.elementId;
        if (!elementId || !gestureId) return;
        documentStore.getState().dispatch(
          {
            type: "element.patch",
            payload: { elementId, ...styleFieldsFor(viewport, { rotationDeg: rotation }) },
          },
          { gestureId },
        );
      })
      .on("rotateEnd", endGesture);

    return () => {
      unsubscribe();
      moveable.destroy();
      selecto.destroy();
    };
  }, [stageRef, rootElementIds, viewport, documentStore, sessionStore, zoomPercent, enabled]);
}
