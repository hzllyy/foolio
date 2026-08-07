"use client";

import { getRootElements } from "@/document/schema/scene-graph";
import { ElementRenderer } from "./ElementRenderer";
import type { RenderInput } from "./types";
import styles from "./scene.module.css";

/**
 * Shared entry point for editor, preview, and published rendering. The
 * `mode` only ever changes the outer wrapper's `data-render-mode` attribute -
 * everything inside is identical authored markup (see docs/implementation-plan.md
 * Phase 1 tests).
 */
export function SceneRenderer({ document, pageId, viewport, scrollOffsetPx, mode }: RenderInput) {
  const page = document.pages[pageId];
  if (!page) {
    return (
      <div role="alert" data-render-mode={mode}>
        Page not found: {pageId}
      </div>
    );
  }

  const pageViewport = page.viewports[viewport];
  const roots = getRootElements(document, pageId);

  return (
    <div
      className={styles.scene}
      data-render-mode={mode}
      style={{
        width: pageViewport.widthPx,
        height: pageViewport.viewportHeightPx,
        background:
          pageViewport.background.type === "solid" ? pageViewport.background.color : undefined,
      }}
    >
      {roots.map((element) => (
        <ElementRenderer
          key={element.id}
          document={document}
          element={element}
          viewport={viewport}
          scrollOffsetPx={scrollOffsetPx}
        />
      ))}
    </div>
  );
}
