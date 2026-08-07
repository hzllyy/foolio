export type ToolId = "select" | "shape" | "text" | "upload" | "polygon" | "pen";

/** Tools that create a new element when the canvas is clicked (all tools except Select). */
export const CREATION_TOOL_IDS = [
  "shape",
  "text",
  "upload",
  "polygon",
  "pen",
] as const satisfies readonly ToolId[];

export type CreationToolId = (typeof CREATION_TOOL_IDS)[number];

export function isCreationTool(tool: ToolId): tool is CreationToolId {
  return (CREATION_TOOL_IDS as readonly ToolId[]).includes(tool);
}
