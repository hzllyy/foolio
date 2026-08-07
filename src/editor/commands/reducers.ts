import type { Draft } from "immer";
import { current } from "immer";
import type { ElementAnimation, ElementNode, PageNode, ProjectDocument } from "@/document/schema";
import {
  createDefaultPageViewports,
  elementAnimationKey,
  elementAnimationSchema,
  elementNodeSchema,
  pageNodeSchema,
} from "@/document/schema";
import { InvalidCommandError } from "./types";
import type {
  CreateElementInput,
  CreatePageInput,
  DeleteKeyframeInput,
  DeleteElementInput,
  DeletePageInput,
  DuplicatePageInput,
  PatchElementInput,
  RenamePageInput,
  ReorderPageInput,
  ReparentElementInput,
  ResizePageInput,
  UpsertKeyframeInput,
} from "./types";

function requireElement(document: ProjectDocument, elementId: string): ElementNode {
  const element = document.elements[elementId];
  if (!element) throw new InvalidCommandError(`Unknown element: ${elementId}`);
  return element;
}

function requirePage(document: ProjectDocument, pageId: string) {
  const page = document.pages[pageId];
  if (!page) throw new InvalidCommandError(`Unknown page: ${pageId}`);
  return page;
}

/** True if `candidateId` is `ancestorId` itself or a descendant of it. */
function isSelfOrDescendant(
  document: ProjectDocument,
  ancestorId: string,
  candidateId: string,
): boolean {
  if (ancestorId === candidateId) return true;
  const ancestor = document.elements[ancestorId];
  if (!ancestor) return false;
  return ancestor.childIds.some((childId) => isSelfOrDescendant(document, childId, candidateId));
}

function siblingListFor(
  draft: Draft<ProjectDocument>,
  parentId: string | null,
  pageId: string,
): string[] {
  return parentId === null
    ? requirePage(draft, pageId).rootElementIds
    : requireElement(draft, parentId).childIds;
}

export function applyCreateElement(draft: Draft<ProjectDocument>, input: CreateElementInput): void {
  if (draft.elements[input.id]) {
    throw new InvalidCommandError(`Element already exists: ${input.id}`);
  }
  requirePage(draft, input.pageId);
  if (input.parentId !== null) {
    const parent = requireElement(draft, input.parentId);
    if (parent.pageId !== input.pageId) {
      throw new InvalidCommandError("Cannot create an element under a parent on a different page");
    }
  }

  const element: ElementNode = {
    id: input.id,
    pageId: input.pageId,
    parentId: input.parentId,
    kind: input.kind,
    name: input.name,
    childIds: [],
    hidden: false,
    locked: false,
    base: input.base,
    viewportOverrides: {},
    content: input.content,
  };
  elementNodeSchema.parse(element);

  const siblings = siblingListFor(draft, input.parentId, input.pageId);
  const index =
    input.index === undefined
      ? siblings.length
      : Math.max(0, Math.min(input.index, siblings.length));
  siblings.splice(index, 0, input.id);
  draft.elements[input.id] = element as Draft<ElementNode>;
}

export function applyPatchElement(draft: Draft<ProjectDocument>, input: PatchElementInput): void {
  const element = requireElement(draft, input.elementId);

  if (input.name !== undefined) element.name = input.name;
  if (input.hidden !== undefined) element.hidden = input.hidden;
  if (input.locked !== undefined) element.locked = input.locked;
  if (input.base) Object.assign(element.base, input.base);
  if (input.mobileOverride !== undefined) {
    if (input.mobileOverride === null) {
      delete element.viewportOverrides.mobile;
    } else {
      element.viewportOverrides.mobile = {
        ...element.viewportOverrides.mobile,
        ...input.mobileOverride,
      };
    }
  }
  if (input.content) element.content = input.content as Draft<ElementNode>["content"];

  elementNodeSchema.parse(element);
}

export function applyDeleteElement(draft: Draft<ProjectDocument>, input: DeleteElementInput): void {
  const element = requireElement(draft, input.elementId);

  const toDelete: string[] = [];
  (function collect(id: string) {
    toDelete.push(id);
    const node = draft.elements[id];
    if (node) node.childIds.forEach(collect);
  })(input.elementId);

  const siblings = siblingListFor(draft, element.parentId, element.pageId);
  const siblingIndex = siblings.indexOf(input.elementId);
  if (siblingIndex !== -1) siblings.splice(siblingIndex, 1);

  for (const id of toDelete) {
    delete draft.elements[id];
    delete draft.animations[`${id}:desktop`];
    delete draft.animations[`${id}:mobile`];
  }
}

export function applyReparentElement(
  draft: Draft<ProjectDocument>,
  input: ReparentElementInput,
): void {
  const element = requireElement(draft, input.elementId);

  if (input.newParentId !== null) {
    if (isSelfOrDescendant(draft, input.elementId, input.newParentId)) {
      throw new InvalidCommandError(
        "Cannot reparent an element into itself or one of its own descendants",
      );
    }
    const newParent = requireElement(draft, input.newParentId);
    if (newParent.pageId !== element.pageId) {
      throw new InvalidCommandError("Cannot reparent an element to a different page");
    }
  }

  const oldSiblings = siblingListFor(draft, element.parentId, element.pageId);
  const oldIndex = oldSiblings.indexOf(input.elementId);
  if (oldIndex !== -1) oldSiblings.splice(oldIndex, 1);

  element.parentId = input.newParentId;

  const newSiblings = siblingListFor(draft, input.newParentId, element.pageId);
  const index = Math.max(0, Math.min(input.index, newSiblings.length));
  newSiblings.splice(index, 0, input.elementId);
}

export function applyResizePage(draft: Draft<ProjectDocument>, input: ResizePageInput): void {
  const page = requirePage(draft, input.pageId);
  const viewport = page.viewports[input.viewport];
  if (input.widthPx !== undefined) viewport.widthPx = input.widthPx;
  if (input.viewportHeightPx !== undefined) viewport.viewportHeightPx = input.viewportHeightPx;
  if (input.scrollLengthPx !== undefined) viewport.scrollLengthPx = input.scrollLengthPx;
}

function requireUniqueSlug(
  draft: Draft<ProjectDocument>,
  slug: string,
  excludePageId?: string,
): void {
  const collision = Object.values(current(draft.pages)).find(
    (page) => page.slug === slug && page.id !== excludePageId,
  );
  if (collision) throw new InvalidCommandError(`Page slug already in use: ${slug}`);
}

export function applyCreatePage(draft: Draft<ProjectDocument>, input: CreatePageInput): void {
  if (draft.pages[input.id]) throw new InvalidCommandError(`Page already exists: ${input.id}`);
  requireUniqueSlug(draft, input.slug);

  const page: PageNode = {
    id: input.id,
    name: input.name,
    slug: input.slug,
    rootElementIds: [],
    viewports: createDefaultPageViewports(),
  };
  pageNodeSchema.parse(page);

  const index =
    input.index === undefined
      ? draft.pageOrder.length
      : Math.max(0, Math.min(input.index, draft.pageOrder.length));
  draft.pageOrder.splice(index, 0, input.id);
  draft.pages[input.id] = page as Draft<PageNode>;
}

export function applyRenamePage(draft: Draft<ProjectDocument>, input: RenamePageInput): void {
  const page = requirePage(draft, input.pageId);
  page.name = input.name;
}

export function applyDeletePage(draft: Draft<ProjectDocument>, input: DeletePageInput): void {
  requirePage(draft, input.pageId);
  if (draft.pageOrder.length <= 1) {
    throw new InvalidCommandError("Cannot delete the only page in a project");
  }

  const orderIndex = draft.pageOrder.indexOf(input.pageId);
  if (orderIndex !== -1) draft.pageOrder.splice(orderIndex, 1);

  for (const [elementId, element] of Object.entries(current(draft.elements))) {
    if (element.pageId !== input.pageId) continue;
    delete draft.elements[elementId];
    delete draft.animations[`${elementId}:desktop`];
    delete draft.animations[`${elementId}:mobile`];
  }

  delete draft.pages[input.pageId];
}

export function applyReorderPage(draft: Draft<ProjectDocument>, input: ReorderPageInput): void {
  requirePage(draft, input.pageId);
  const currentIndex = draft.pageOrder.indexOf(input.pageId);
  if (currentIndex === -1) {
    throw new InvalidCommandError(`Page not present in pageOrder: ${input.pageId}`);
  }
  draft.pageOrder.splice(currentIndex, 1);
  const index = Math.max(0, Math.min(input.index, draft.pageOrder.length));
  draft.pageOrder.splice(index, 0, input.pageId);
}

export function applyDuplicatePage(draft: Draft<ProjectDocument>, input: DuplicatePageInput): void {
  const source = requirePage(draft, input.sourcePageId);
  if (draft.pages[input.newPageId]) {
    throw new InvalidCommandError(`Page already exists: ${input.newPageId}`);
  }
  requireUniqueSlug(draft, input.slug);

  const sourceElements = Object.values(current(draft.elements)).filter(
    (element) => element.pageId === input.sourcePageId,
  );
  for (const element of sourceElements) {
    if (!input.elementIdMap[element.id]) {
      throw new InvalidCommandError(`Missing new ID mapping for source element: ${element.id}`);
    }
  }

  const remap = (id: string): string => {
    const mapped = input.elementIdMap[id];
    if (!mapped) throw new InvalidCommandError(`Unmapped element ID during duplication: ${id}`);
    return mapped;
  };

  const sourceSnapshot = current(source);
  const newPage: PageNode = {
    id: input.newPageId,
    name: input.name,
    slug: input.slug,
    rootElementIds: sourceSnapshot.rootElementIds.map(remap),
    viewports: sourceSnapshot.viewports,
  };
  pageNodeSchema.parse(newPage);

  for (const oldElement of sourceElements) {
    const newElement: ElementNode = {
      ...oldElement,
      id: remap(oldElement.id),
      pageId: input.newPageId,
      parentId: oldElement.parentId ? remap(oldElement.parentId) : null,
      childIds: oldElement.childIds.map(remap),
    };
    elementNodeSchema.parse(newElement);
    draft.elements[newElement.id] = newElement as Draft<ElementNode>;

    for (const viewport of ["desktop", "mobile"] as const) {
      const oldAnimation = current(draft.animations)[`${oldElement.id}:${viewport}`];
      if (!oldAnimation) continue;
      draft.animations[`${newElement.id}:${viewport}`] = {
        ...oldAnimation,
        elementId: newElement.id,
      };
    }
  }

  const index =
    input.index === undefined
      ? draft.pageOrder.indexOf(input.sourcePageId) + 1
      : Math.max(0, Math.min(input.index, draft.pageOrder.length));
  draft.pageOrder.splice(index, 0, input.newPageId);
  draft.pages[input.newPageId] = newPage as Draft<PageNode>;
}

export function applyUpsertKeyframe(draft: Draft<ProjectDocument>, input: UpsertKeyframeInput): void {
  const element = requireElement(draft, input.elementId);
  const key = elementAnimationKey(element.id, input.viewport);

  const existing = draft.animations[key];
  const animation: ElementAnimation = existing
    ? {
        ...current(existing),
        tracks: { ...current(existing).tracks },
      }
    : {
        elementId: element.id,
        viewport: input.viewport,
        tracks: {},
      };

  const existingTrack = animation.tracks[input.property];
  const keyframes = existingTrack ? [...existingTrack.keyframes] : [];

  const byIdIndex = keyframes.findIndex((keyframe) => keyframe.id === input.keyframe.id);
  if (byIdIndex !== -1) {
    keyframes[byIdIndex] = input.keyframe;
    // If a moved existing keyframe lands on another keyframe's offset, keep the moved keyframe and
    // drop the collided one so each track still has unique offsetPx values.
    for (let i = keyframes.length - 1; i >= 0; i--) {
      const keyframe = keyframes[i]!;
      if (keyframe.id !== input.keyframe.id && keyframe.offsetPx === input.keyframe.offsetPx) {
        keyframes.splice(i, 1);
      }
    }
  } else {
    const byOffsetIndex = keyframes.findIndex((keyframe) => keyframe.offsetPx === input.keyframe.offsetPx);
    if (byOffsetIndex !== -1) keyframes[byOffsetIndex] = input.keyframe;
    else keyframes.push(input.keyframe);
  }

  keyframes.sort((a, b) => a.offsetPx - b.offsetPx);
  animation.tracks[input.property] = { property: input.property, keyframes };

  elementAnimationSchema.parse(animation);
  draft.animations[key] = animation as Draft<(typeof draft.animations)[string]>;
}

export function applyDeleteKeyframe(draft: Draft<ProjectDocument>, input: DeleteKeyframeInput): void {
  const key = elementAnimationKey(input.elementId, input.viewport);
  const existing = draft.animations[key];
  if (!existing) return;

  const track = existing.tracks[input.property];
  if (!track) return;

  const keyframes = track.keyframes.filter((keyframe) => keyframe.id !== input.keyframeId);
  if (keyframes.length === 0) {
    delete existing.tracks[input.property];
  } else {
    existing.tracks[input.property] = { property: input.property, keyframes };
  }

  const hasAnyTrack = Object.values(existing.tracks).some(Boolean);
  if (!hasAnyTrack) delete draft.animations[key];
}
