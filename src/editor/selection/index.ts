// Ephemeral session state: active tool, selected element IDs, hover, zoom, and playhead.
import type { ProjectDocument, ViewportName } from "@/document/schema";
import { resolveElementStyle } from "@/document/geometry";

export type Bounds = { x: number; y: number; width: number; height: number };

/** Union bounding box (in page-relative coordinates) of the given root-level elements. */
export function getSelectionBounds(
  document: ProjectDocument,
  selectedElementIds: string[],
  viewport: ViewportName,
): Bounds | undefined {
  const boxes = selectedElementIds
    .map((id) => document.elements[id])
    .filter((element): element is NonNullable<typeof element> => element !== undefined)
    .map((element) => resolveElementStyle(element, viewport));

  if (boxes.length === 0) return undefined;

  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
