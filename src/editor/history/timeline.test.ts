import { describe, expect, it } from "vitest";
import { fixtureProjectDocument } from "@/document/schema/fixtures";
import {
  canRedoTimeline,
  canUndoTimeline,
  createTimeline,
  dispatchTimelineCommand,
  endGesture,
  redoTimeline,
  undoTimeline,
} from "@/editor/history/timeline";

describe("timeline dispatch without a gesture", () => {
  it("pushes one history entry per dispatched command", () => {
    let state = createTimeline(fixtureProjectDocument);
    state = dispatchTimelineCommand(state, {
      type: "element.patch",
      payload: { elementId: "hero-shape", base: { x: 1 } },
    });
    state = dispatchTimelineCommand(state, {
      type: "element.patch",
      payload: { elementId: "hero-shape", base: { x: 2 } },
    });

    expect(state.history.entries).toHaveLength(2);
    expect(state.document.elements["hero-shape"]!.base.x).toBe(2);
  });

  it("undo then redo restores forward state", () => {
    let state = createTimeline(fixtureProjectDocument);
    state = dispatchTimelineCommand(state, {
      type: "element.patch",
      payload: { elementId: "hero-shape", base: { x: 1 } },
    });

    expect(canUndoTimeline(state)).toBe(true);
    expect(canRedoTimeline(state)).toBe(false);

    state = undoTimeline(state);
    expect(state.document.elements["hero-shape"]!.base.x).toBe(0);
    expect(canRedoTimeline(state)).toBe(true);

    state = redoTimeline(state);
    expect(state.document.elements["hero-shape"]!.base.x).toBe(1);
  });

  it("dispatching after an undo truncates the redo tail", () => {
    let state = createTimeline(fixtureProjectDocument);
    state = dispatchTimelineCommand(state, {
      type: "element.patch",
      payload: { elementId: "hero-shape", base: { x: 1 } },
    });
    state = undoTimeline(state);
    state = dispatchTimelineCommand(state, {
      type: "element.patch",
      payload: { elementId: "hero-shape", base: { x: 5 } },
    });

    expect(canRedoTimeline(state)).toBe(false);
    expect(state.history.entries).toHaveLength(1);
    expect(state.document.elements["hero-shape"]!.base.x).toBe(5);
  });
});

describe("timeline dispatch with a gesture", () => {
  it("coalesces a whole drag into a single history entry", () => {
    let state = createTimeline(fixtureProjectDocument);
    const gestureId = "drag-1";

    state = dispatchTimelineCommand(
      state,
      { type: "element.patch", payload: { elementId: "hero-shape", base: { x: 10 } } },
      { gestureId },
    );
    state = dispatchTimelineCommand(
      state,
      { type: "element.patch", payload: { elementId: "hero-shape", base: { x: 20 } } },
      { gestureId },
    );
    state = dispatchTimelineCommand(
      state,
      { type: "element.patch", payload: { elementId: "hero-shape", base: { x: 30 } } },
      { gestureId },
    );

    expect(state.history.entries).toHaveLength(1);
    expect(state.document.elements["hero-shape"]!.base.x).toBe(30);

    state = undoTimeline(state);
    expect(state.document.elements["hero-shape"]!.base.x).toBe(0);
  });

  it("starts a new history entry once the gesture ends", () => {
    let state = createTimeline(fixtureProjectDocument);
    state = dispatchTimelineCommand(
      state,
      { type: "element.patch", payload: { elementId: "hero-shape", base: { x: 10 } } },
      { gestureId: "drag-1" },
    );
    state = endGesture(state);
    state = dispatchTimelineCommand(
      state,
      { type: "element.patch", payload: { elementId: "hero-shape", base: { x: 20 } } },
      { gestureId: "drag-2" },
    );

    expect(state.history.entries).toHaveLength(2);

    state = undoTimeline(state);
    expect(state.document.elements["hero-shape"]!.base.x).toBe(10);
    state = undoTimeline(state);
    expect(state.document.elements["hero-shape"]!.base.x).toBe(0);
  });

  it("a differing gestureId starts a new entry instead of coalescing", () => {
    let state = createTimeline(fixtureProjectDocument);
    state = dispatchTimelineCommand(
      state,
      { type: "element.patch", payload: { elementId: "hero-shape", base: { x: 10 } } },
      { gestureId: "drag-1" },
    );
    state = dispatchTimelineCommand(
      state,
      { type: "element.patch", payload: { elementId: "hero-shape", base: { x: 20 } } },
      { gestureId: "drag-2" },
    );

    expect(state.history.entries).toHaveLength(2);
  });
});
