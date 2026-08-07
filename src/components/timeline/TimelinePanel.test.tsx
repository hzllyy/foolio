import { describe, expect, it } from "vitest";
import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { elementAnimationKey, type ProjectDocument } from "@/document/schema";
import { fixtureProjectDocument } from "@/document/schema/fixtures";
import { createDocumentStore } from "@/editor/store/documentStore";
import { createSessionStore } from "@/editor/store/sessionStore";
import { EditorStoresProvider } from "@/components/builder-shell/EditorShell";
import { TimelinePanel } from "./TimelinePanel";

function renderTimeline(document: ProjectDocument) {
  const documentStore = createDocumentStore(document);
  const sessionStore = createSessionStore({
    activePageId: "page-1",
    viewport: "desktop",
    mode: "animate",
  });
  sessionStore.getState().selectOnly("hero-shape");

  render(
    <EditorStoresProvider value={{ documentStore, sessionStore, assetUrls: new Map() }}>
      <TimelinePanel />
    </EditorStoresProvider>,
  );

  return { documentStore, sessionStore };
}

describe("TimelinePanel", () => {
  it("dragging a keyframe onto another offset shows collision notice and deterministically replaces", async () => {
    const animationKey = elementAnimationKey("hero-shape", "desktop");
    const document: ProjectDocument = {
      ...fixtureProjectDocument,
      animations: {
        ...fixtureProjectDocument.animations,
        [animationKey]: {
          elementId: "hero-shape",
          viewport: "desktop",
          tracks: {
            x: {
              property: "x",
              keyframes: [
                { id: "dragged", offsetPx: 100, value: 10, easing: { type: "linear" } },
                { id: "target", offsetPx: 300, value: 20, easing: { type: "linear" } },
              ],
            },
          },
        },
      },
    };

    const { documentStore } = renderTimeline(document);

    const dragged = screen.getByRole("button", { name: "x keyframe at 100px" });
    const lane = dragged.parentElement as HTMLDivElement;
    Object.defineProperty(lane, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        left: 100,
        top: 0,
        right: 300,
        bottom: 20,
        width: 200,
        height: 20,
        x: 100,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    fireEvent.pointerDown(dragged, { pointerId: 1, clientX: 133 });
    const move = createEvent.pointerMove(dragged, { pointerId: 1 });
    Object.defineProperty(move, "clientX", { value: 200 });
    fireEvent(dragged, move);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Collision at 300px. Release to replace the existing keyframe.",
      );
    });

    fireEvent.pointerUp(dragged, { pointerId: 1, clientX: 200 });

    await waitFor(() => {
      const track =
        documentStore.getState().document.animations[animationKey]?.tracks.x?.keyframes ?? [];
      expect(track).toEqual([
        { id: "dragged", offsetPx: 300, value: 10, easing: { type: "linear" } },
      ]);
    });
  });
});
