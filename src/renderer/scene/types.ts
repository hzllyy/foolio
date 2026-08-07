import type { ProjectDocument, ViewportName } from "@/document/schema";

export type RenderMode = "editor" | "preview" | "published";

/** The renderer's only input contract (see architecture.md section 5). It must not depend on editor/session state. */
export type RenderInput = {
  document: ProjectDocument;
  pageId: string;
  viewport: ViewportName;
  scrollOffsetPx: number;
  mode: RenderMode;
};
