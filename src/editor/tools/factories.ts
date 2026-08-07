import type { CreateElementInput } from "@/editor/commands/types";
import type { ElementStyle } from "@/document/schema";

const DEFAULT_ACCENT_FILL = "#566498";
const DEFAULT_STROKE_COLOR = "#0f2164";
const DEFAULT_TEXT_COLOR = "#0f2164";

export type CreateAtPoint = {
  id: string;
  pageId: string;
  parentId: string | null;
  x: number;
  y: number;
};

function baseStyle(x: number, y: number, width: number, height: number): ElementStyle {
  return { x, y, width, height, rotationDeg: 0, opacity: 1 };
}

/** Default rectangle for the Shape tool, positioned at the click point. */
export function createDefaultShapeElement(input: CreateAtPoint): CreateElementInput {
  return {
    id: input.id,
    pageId: input.pageId,
    parentId: input.parentId,
    kind: "shape",
    name: "Shape",
    base: {
      ...baseStyle(input.x, input.y, 160, 120),
      fill: { type: "solid", color: DEFAULT_ACCENT_FILL },
    },
    content: { kind: "shape", shape: "rectangle" },
  };
}

/** Default text box for the Text tool, positioned at the click point. */
export function createDefaultTextElement(input: CreateAtPoint): CreateElementInput {
  return {
    id: input.id,
    pageId: input.pageId,
    parentId: input.parentId,
    kind: "text",
    name: "Text",
    base: baseStyle(input.x, input.y, 240, 48),
    content: {
      kind: "text",
      text: "Text",
      typography: {
        fontFamily: "var(--font-family-body)",
        fontSizePx: 18,
        fontWeight: 400,
        lineHeightPx: 24,
        letterSpacingPx: 0,
        color: DEFAULT_TEXT_COLOR,
        textAlign: "left",
      },
    },
  };
}

/** Default triangle for the Polygon tool, positioned at the click point. */
export function createDefaultPolygonElement(input: CreateAtPoint): CreateElementInput {
  return {
    id: input.id,
    pageId: input.pageId,
    parentId: input.parentId,
    kind: "polygon",
    name: "Polygon",
    base: {
      ...baseStyle(input.x, input.y, 120, 120),
      fill: { type: "solid", color: DEFAULT_ACCENT_FILL },
    },
    content: {
      kind: "polygon",
      points: [
        { x: 60, y: 0 },
        { x: 120, y: 120 },
        { x: 0, y: 120 },
      ],
    },
  };
}

export type CreatePenElementInput = CreateAtPoint & {
  points: [number, number][];
  svgPath: string;
  closed?: boolean;
};

/** Builds a path element from freehand pen points already captured on the canvas. */
export function createPenElement(input: CreatePenElementInput): CreateElementInput {
  const xs = input.points.map(([x]) => x);
  const ys = input.points.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) || 1;
  const height = Math.max(...ys) - Math.min(...ys) || 1;
  return {
    id: input.id,
    pageId: input.pageId,
    parentId: input.parentId,
    kind: "path",
    name: "Path",
    base: {
      ...baseStyle(input.x, input.y, width, height),
      stroke: { color: DEFAULT_STROKE_COLOR, widthPx: 2 },
    },
    content: {
      kind: "path",
      points: input.points,
      svgPath: input.svgPath,
      closed: input.closed ?? false,
    },
  };
}

export type CreateImageElementInput = CreateAtPoint & {
  /** Must be a resolved, already-validated asset reference; never a pending upload. */
  assetId: string;
  alt: string;
  widthPx: number;
  heightPx: number;
};

/**
 * Builds an image element for the Upload tool. Requires a concrete `assetId`, so an in-progress
 * or invalid upload can never be turned into a command (see docs/implementation-plan.md Phase 2 tests).
 */
export function createImageElement(input: CreateImageElementInput): CreateElementInput {
  return {
    id: input.id,
    pageId: input.pageId,
    parentId: input.parentId,
    kind: "image",
    name: "Image",
    base: baseStyle(input.x, input.y, input.widthPx, input.heightPx),
    content: { kind: "image", assetId: input.assetId, fit: "cover", alt: input.alt },
  };
}
