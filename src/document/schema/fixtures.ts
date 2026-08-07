import type { ProjectDocument } from "./project";
import { CURRENT_SCHEMA_VERSION, elementAnimationKey } from "./project";

/**
 * A small but representative document fixture: one page, one of every element
 * kind, a mobile viewport override, and a desktop-only animation track (to
 * exercise the mobile fallback described in docs/data-model.md section 6).
 * Used by schema/renderer tests and the `/dev/renderer` fixture demo.
 */
export const fixtureProjectDocument: ProjectDocument = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  projectId: "fixture-project",
  name: "Fixture Portfolio",
  settings: {
    breakpointPx: 768,
    defaultViewport: "desktop",
    reducedMotionPose: "first-keyframe",
  },
  pageOrder: ["page-1"],
  pages: {
    "page-1": {
      id: "page-1",
      name: "Home",
      slug: "home",
      rootElementIds: ["hero-group", "hero-polygon", "hero-image", "hero-path", "hero-sprite"],
      viewports: {
        desktop: {
          widthPx: 1440,
          viewportHeightPx: 900,
          scrollLengthPx: 600,
          background: { type: "solid", color: "#0f2164" },
        },
        mobile: {
          widthPx: 390,
          viewportHeightPx: 844,
          scrollLengthPx: 400,
          background: { type: "solid", color: "#0f2164" },
        },
      },
    },
  },
  elements: {
    "hero-group": {
      id: "hero-group",
      pageId: "page-1",
      parentId: null,
      kind: "group",
      name: "Hero group",
      childIds: ["hero-shape", "hero-text"],
      hidden: false,
      locked: false,
      base: { x: 0, y: 0, width: 400, height: 240, rotationDeg: 0, opacity: 1 },
      viewportOverrides: {},
      content: { kind: "group" },
    },
    "hero-shape": {
      id: "hero-shape",
      pageId: "page-1",
      parentId: "hero-group",
      kind: "shape",
      name: "Hero shape",
      childIds: [],
      hidden: false,
      locked: false,
      base: {
        x: 0,
        y: 0,
        width: 200,
        height: 120,
        rotationDeg: 0,
        opacity: 1,
        fill: { type: "solid", color: "#fbf0d3" },
        borderRadiusPx: 12,
      },
      viewportOverrides: {
        mobile: { x: 8, width: 160 },
      },
      content: { kind: "shape", shape: "rectangle" },
    },
    "hero-text": {
      id: "hero-text",
      pageId: "page-1",
      parentId: "hero-group",
      kind: "text",
      name: "Hero text",
      childIds: [],
      hidden: false,
      locked: false,
      base: { x: 0, y: 140, width: 360, height: 60, rotationDeg: 0, opacity: 1 },
      viewportOverrides: {},
      content: {
        kind: "text",
        text: "Foolio",
        typography: {
          fontFamily: "var(--font-family-display)",
          fontSizePx: 32,
          fontWeight: 700,
          lineHeightPx: 40,
          letterSpacingPx: 0,
          color: "#fbf0d3",
          textAlign: "left",
        },
      },
    },
    "hero-polygon": {
      id: "hero-polygon",
      pageId: "page-1",
      parentId: null,
      kind: "polygon",
      name: "Hero polygon",
      childIds: [],
      hidden: false,
      locked: false,
      base: {
        x: 420,
        y: 0,
        width: 120,
        height: 120,
        rotationDeg: 0,
        opacity: 1,
        fill: { type: "solid", color: "#566498" },
      },
      viewportOverrides: {},
      content: {
        kind: "polygon",
        points: [
          { x: 60, y: 0 },
          { x: 120, y: 120 },
          { x: 0, y: 120 },
        ],
      },
    },
    "hero-image": {
      id: "hero-image",
      pageId: "page-1",
      parentId: null,
      kind: "image",
      name: "Hero image",
      childIds: [],
      hidden: false,
      locked: false,
      base: { x: 560, y: 0, width: 160, height: 120, rotationDeg: 0, opacity: 1 },
      viewportOverrides: {},
      content: { kind: "image", assetId: "asset-hero", fit: "cover", alt: "Portfolio hero photo" },
    },
    "hero-path": {
      id: "hero-path",
      pageId: "page-1",
      parentId: null,
      kind: "path",
      name: "Hero path",
      childIds: [],
      hidden: false,
      locked: false,
      base: {
        x: 0,
        y: 260,
        width: 200,
        height: 40,
        rotationDeg: 0,
        opacity: 1,
        stroke: { color: "#0f2164", widthPx: 2 },
      },
      viewportOverrides: {},
      content: {
        kind: "path",
        points: [
          [0, 20],
          [100, 0],
          [200, 20],
        ],
        svgPath: "M0 20 L100 0 L200 20",
        closed: false,
      },
    },
    "hero-sprite": {
      id: "hero-sprite",
      pageId: "page-1",
      parentId: null,
      kind: "sprite",
      name: "Hero sprite",
      childIds: [],
      hidden: false,
      locked: false,
      base: { x: 220, y: 260, width: 120, height: 120, rotationDeg: 0, opacity: 1 },
      viewportOverrides: {},
      content: {
        kind: "sprite",
        frames: [
          { id: "frame-1", assetId: "asset-sprite-1", order: 0 },
          { id: "frame-2", assetId: "asset-sprite-2", order: 1 },
        ],
        playback: { startOffsetPx: 0, endOffsetPx: 600, behavior: "clamp" },
      },
    },
  },
  animations: {
    [elementAnimationKey("hero-group", "desktop")]: {
      elementId: "hero-group",
      viewport: "desktop",
      tracks: {
        opacity: {
          property: "opacity",
          keyframes: [
            { id: "kf-1", offsetPx: 0, value: 0, easing: { type: "linear" } },
            { id: "kf-2", offsetPx: 200, value: 1, easing: { type: "linear" } },
          ],
        },
      },
    },
  },
  assetIds: ["asset-hero", "asset-sprite-1", "asset-sprite-2"],
};
