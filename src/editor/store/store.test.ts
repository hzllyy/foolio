import { describe, expect, it } from "vitest";
import { createDocumentStore } from "@/editor/store/documentStore";
import { createSessionStore } from "@/editor/store/sessionStore";
import { fixtureProjectDocument } from "@/document/schema/fixtures";

describe("createDocumentStore", () => {
  it("dispatches commands, tracks canUndo/canRedo, and undoes/redoes", () => {
    const useStore = createDocumentStore(fixtureProjectDocument);

    expect(useStore.getState().canUndo).toBe(false);

    useStore
      .getState()
      .dispatch({ type: "element.patch", payload: { elementId: "hero-shape", base: { x: 50 } } });
    expect(useStore.getState().document.elements["hero-shape"]!.base.x).toBe(50);
    expect(useStore.getState().canUndo).toBe(true);
    expect(useStore.getState().canRedo).toBe(false);

    useStore.getState().undo();
    expect(useStore.getState().document.elements["hero-shape"]!.base.x).toBe(0);
    expect(useStore.getState().canRedo).toBe(true);

    useStore.getState().redo();
    expect(useStore.getState().document.elements["hero-shape"]!.base.x).toBe(50);
  });

  it("coalesces a gesture's repeated dispatches into a single undo step", () => {
    const useStore = createDocumentStore(fixtureProjectDocument);
    const gestureId = "drag-1";

    useStore
      .getState()
      .dispatch(
        { type: "element.patch", payload: { elementId: "hero-shape", base: { x: 10 } } },
        { gestureId },
      );
    useStore
      .getState()
      .dispatch(
        { type: "element.patch", payload: { elementId: "hero-shape", base: { x: 20 } } },
        { gestureId },
      );
    useStore.getState().endGesture();

    expect(useStore.getState().document.elements["hero-shape"]!.base.x).toBe(20);
    useStore.getState().undo();
    expect(useStore.getState().document.elements["hero-shape"]!.base.x).toBe(0);
    expect(useStore.getState().canUndo).toBe(false);
  });

  it("invokes onPatches with the forward patches on dispatch/redo and the inverse patches on undo", () => {
    const calls: { patches: unknown; x: number }[] = [];
    const useStore = createDocumentStore(fixtureProjectDocument, {
      onPatches: (patches, document) => {
        calls.push({ patches, x: document.elements["hero-shape"]!.base.x });
      },
    });

    useStore
      .getState()
      .dispatch({ type: "element.patch", payload: { elementId: "hero-shape", base: { x: 50 } } });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.x).toBe(50);

    useStore.getState().undo();
    expect(calls).toHaveLength(2);
    expect(calls[1]!.x).toBe(0);

    useStore.getState().redo();
    expect(calls).toHaveLength(3);
    expect(calls[2]!.x).toBe(50);
  });
});

describe("createSessionStore", () => {
  it("initializes with defaults and supports selection helpers", () => {
    const useStore = createSessionStore({ activePageId: "page-1" });

    expect(useStore.getState().viewport).toBe("desktop");
    expect(useStore.getState().activeTool).toBe("select");

    useStore.getState().selectOnly("hero-shape");
    expect(useStore.getState().selectedElementIds).toEqual(["hero-shape"]);

    useStore.getState().toggleSelect("hero-text");
    expect(useStore.getState().selectedElementIds).toEqual(["hero-shape", "hero-text"]);

    useStore.getState().toggleSelect("hero-shape");
    expect(useStore.getState().selectedElementIds).toEqual(["hero-text"]);

    useStore.getState().clearSelection();
    expect(useStore.getState().selectedElementIds).toEqual([]);
  });

  it("clears selection and hover when the active tool changes", () => {
    const useStore = createSessionStore({ activePageId: "page-1" });
    useStore.getState().selectOnly("hero-shape");
    useStore.getState().setHoverElementId("hero-text");

    useStore.getState().setActiveTool("shape");

    expect(useStore.getState().selectedElementIds).toEqual([]);
    expect(useStore.getState().hoverElementId).toBeNull();
    expect(useStore.getState().activeTool).toBe("shape");
  });

  it("clamps zoom to the supported range", () => {
    const useStore = createSessionStore({ activePageId: "page-1" });
    useStore.getState().setZoomPercent(2000);
    expect(useStore.getState().zoomPercent).toBe(800);
    useStore.getState().setZoomPercent(1);
    expect(useStore.getState().zoomPercent).toBe(10);
  });
});
