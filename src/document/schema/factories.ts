import { createDefaultPageViewports, DEFAULT_BREAKPOINT_PX, type PageNode } from "./page";
import { CURRENT_SCHEMA_VERSION, type ProjectDocument } from "./project";

const DEFAULT_PAGE_ID = "page-home";
const DEFAULT_PAGE_NAME = "Page 1";
const DEFAULT_PAGE_SLUG = "home";

/** Builds a brand-new, empty project document for a fresh guest (or authenticated) project. */
export function createEmptyProject(projectId: string, name = "Untitled project"): ProjectDocument {
  const page: PageNode = {
    id: DEFAULT_PAGE_ID,
    name: DEFAULT_PAGE_NAME,
    slug: DEFAULT_PAGE_SLUG,
    rootElementIds: [],
    viewports: createDefaultPageViewports(),
  };

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    projectId,
    name,
    settings: {
      breakpointPx: DEFAULT_BREAKPOINT_PX,
      defaultViewport: "desktop",
      reducedMotionPose: "first-keyframe",
    },
    pageOrder: [DEFAULT_PAGE_ID],
    pages: { [DEFAULT_PAGE_ID]: page },
    elements: {},
    animations: {},
    assetIds: [],
  };
}
