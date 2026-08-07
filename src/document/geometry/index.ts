// Transform math, bounds calculation, snapping, and viewport/breakpoint resolution.
import type { ElementNode, ElementStyle } from "@/document/schema";

/** Resolves which authored viewport applies at a given page width (see docs/decisions.md ADR-005). */
export function resolveViewportForWidth(
  widthPx: number,
  breakpointPx: number,
): "desktop" | "mobile" {
  return widthPx >= breakpointPx ? "desktop" : "mobile";
}

/**
 * Merges an element's base style with its mobile override (if any and if the
 * requested viewport is mobile). Only fields present on the override replace
 * the base value; everything else is inherited (see docs/data-model.md section 5).
 */
export function resolveElementStyle(
  element: ElementNode,
  viewport: "desktop" | "mobile",
): ElementStyle {
  if (viewport !== "mobile") return element.base;
  const override = element.viewportOverrides.mobile;
  if (!override) return element.base;
  return { ...element.base, ...override };
}
