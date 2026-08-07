import type {
  AnimatableProperty,
  ElementContent,
  ElementKind,
  ElementStyle,
  ElementStyleOverride,
  Easing,
  ViewportName,
} from "@/document/schema";

/** Creates a new element as a root or a child of an existing element on the same page. */
export type CreateElementInput = {
  id: string;
  pageId: string;
  parentId: string | null;
  index?: number;
  kind: ElementKind;
  name: string;
  base: ElementStyle;
  content: ElementContent;
};

/** Partially updates an element's name, flags, base style, mobile override, or content. */
export type PatchElementInput = {
  elementId: string;
  name?: string;
  hidden?: boolean;
  locked?: boolean;
  base?: Partial<ElementStyle>;
  mobileOverride?: ElementStyleOverride | null;
  content?: ElementContent;
};

/** Removes an element and all of its descendants. */
export type DeleteElementInput = { elementId: string };

/** Moves an element to a new parent (or to page root when `null`) at a given paint-order index. */
export type ReparentElementInput = {
  elementId: string;
  newParentId: string | null;
  index: number;
};

/** Patches one viewport's dimensions/background for a page. */
export type ResizePageInput = {
  pageId: string;
  viewport: ViewportName;
  widthPx?: number;
  viewportHeightPx?: number;
  scrollLengthPx?: number;
};

/** Creates a new blank page with default desktop/mobile viewports. */
export type CreatePageInput = {
  id: string;
  name: string;
  slug: string;
  /** Position in `pageOrder`; appended to the end when omitted. */
  index?: number;
};

/** Renames a page. */
export type RenamePageInput = { pageId: string; name: string };

/** Removes a page and all of its elements/animations. Rejected if it is the project's only page. */
export type DeletePageInput = { pageId: string };

/** Moves a page to a new position in `pageOrder`. */
export type ReorderPageInput = { pageId: string; index: number };

/**
 * Deep-clones a page and every element under it (with its own animations) using
 * caller-supplied IDs, so the reducer stays pure/deterministic like `element.create`.
 */
export type DuplicatePageInput = {
  sourcePageId: string;
  newPageId: string;
  name: string;
  slug: string;
  /** Maps every existing element ID under `sourcePageId` to a fresh ID for the clone. */
  elementIdMap: Record<string, string>;
  /** Position in `pageOrder`; inserted right after the source page when omitted. */
  index?: number;
};

/** Creates or updates one keyframe on an element/viewport/property track. */
export type UpsertKeyframeInput = {
  elementId: string;
  viewport: ViewportName;
  property: AnimatableProperty;
  keyframe: {
    id: string;
    offsetPx: number;
    value: number;
    easing: Easing;
  };
};

/** Deletes one keyframe from a track, cleaning up empty track/animation containers. */
export type DeleteKeyframeInput = {
  elementId: string;
  viewport: ViewportName;
  property: AnimatableProperty;
  keyframeId: string;
};

export type EditorCommand =
  | { type: "element.create"; payload: CreateElementInput }
  | { type: "element.patch"; payload: PatchElementInput }
  | { type: "element.delete"; payload: DeleteElementInput }
  | { type: "element.reparent"; payload: ReparentElementInput }
  | { type: "page.resize"; payload: ResizePageInput }
  | { type: "page.create"; payload: CreatePageInput }
  | { type: "page.rename"; payload: RenamePageInput }
  | { type: "page.delete"; payload: DeletePageInput }
  | { type: "page.reorder"; payload: ReorderPageInput }
  | { type: "page.duplicate"; payload: DuplicatePageInput }
  | { type: "keyframe.upsert"; payload: UpsertKeyframeInput }
  | { type: "keyframe.delete"; payload: DeleteKeyframeInput };

export class InvalidCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCommandError";
  }
}
