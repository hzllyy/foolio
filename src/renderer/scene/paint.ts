import type { CSSProperties } from "react";
import type { ElementContent, ElementStyle, Paint, Stroke } from "@/document/schema";

function paintToColor(paint: Paint | undefined): string | undefined {
  if (!paint || paint.type === "none") return undefined;
  return paint.color;
}

function strokeToBorder(stroke: Stroke | undefined): string | undefined {
  if (!stroke) return undefined;
  return `${stroke.widthPx}px solid ${stroke.color}`;
}

/**
 * CSS for element kinds whose fill/stroke/radius render as a plain box.
 * Polygon and path draw their own fill/stroke as SVG attributes instead,
 * since their outline isn't a rectangle.
 */
export function resolveBoxPaintStyle(style: ElementStyle, content: ElementContent): CSSProperties {
  if (content.kind === "polygon" || content.kind === "path") return {};
  return {
    backgroundColor: paintToColor(style.fill),
    border: strokeToBorder(style.stroke),
    borderRadius:
      content.kind === "shape" && content.shape === "ellipse"
        ? "50%"
        : (style.borderRadiusPx ?? undefined),
  };
}

export function paintToSvgAttr(paint: Paint | undefined): string {
  return paintToColor(paint) ?? "none";
}

export function strokeToSvgAttrs(stroke: Stroke | undefined): {
  stroke: string;
  strokeWidth: number;
} {
  return { stroke: stroke?.color ?? "none", strokeWidth: stroke?.widthPx ?? 0 };
}
