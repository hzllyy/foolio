"use client";

import { useState } from "react";
import { SceneRenderer } from "@/renderer/scene/SceneRenderer";
import { AssetResolverProvider } from "@/renderer/scene/AssetResolver";
import { fixtureProjectDocument } from "@/document/schema/fixtures";
import type { ViewportName } from "@/document/schema";
import styles from "./renderer-preview.module.css";

const document = fixtureProjectDocument;
const page = document.pages["page-1"]!;
const MAX_SCROLL_OFFSET_PX = page.viewports.desktop.scrollLengthPx;

/** Fixture portfolio renders from JSON in desktop/mobile modes (Phase 1 exit gate). */
export function RendererPreview() {
  const [viewport, setViewport] = useState<ViewportName>("desktop");
  const [scrollOffsetPx, setScrollOffsetPx] = useState(0);

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <label>
          Viewport:{" "}
          <select
            value={viewport}
            onChange={(event) => setViewport(event.target.value as ViewportName)}
          >
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
          </select>
        </label>
        <label>
          Scroll offset: {scrollOffsetPx}px
          <input
            type="range"
            min={0}
            max={MAX_SCROLL_OFFSET_PX}
            value={scrollOffsetPx}
            onChange={(event) => setScrollOffsetPx(Number(event.target.value))}
          />
        </label>
      </div>

      <div className={styles.canvas}>
        <AssetResolverProvider value={() => undefined}>
          <SceneRenderer
            document={document}
            pageId="page-1"
            viewport={viewport}
            scrollOffsetPx={scrollOffsetPx}
            mode="editor"
          />
        </AssetResolverProvider>
      </div>
    </div>
  );
}
