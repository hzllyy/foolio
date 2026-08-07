import type { ProjectDocument } from "./project";
import type { ElementNode } from "./element";

export type SceneGraphIssue = { message: string; elementId?: string; pageId?: string };

/** Returns an element's children in authored paint order, skipping unresolved IDs. */
export function getOrderedChildren(document: ProjectDocument, elementId: string): ElementNode[] {
  const element = document.elements[elementId];
  if (!element) return [];
  return element.childIds
    .map((childId) => document.elements[childId])
    .filter((child): child is ElementNode => child !== undefined);
}

/** Returns a page's root elements in authored paint order, skipping unresolved IDs. */
export function getRootElements(document: ProjectDocument, pageId: string): ElementNode[] {
  const page = document.pages[pageId];
  if (!page) return [];
  return page.rootElementIds
    .map((id) => document.elements[id])
    .filter((element): element is ElementNode => element !== undefined);
}

/** Depth-first, paint-order traversal of a page's element tree. Cycle-safe. */
export function traversePage(
  document: ProjectDocument,
  pageId: string,
  visit: (element: ElementNode, depth: number) => void,
): void {
  const visited = new Set<string>();
  function walk(element: ElementNode, depth: number) {
    if (visited.has(element.id)) return;
    visited.add(element.id);
    visit(element, depth);
    for (const child of getOrderedChildren(document, element.id)) {
      walk(child, depth + 1);
    }
  }
  for (const root of getRootElements(document, pageId)) {
    walk(root, 0);
  }
}

/**
 * Validates scene graph invariants: no missing references, no cross-page
 * parenting, no cycles, and no elements unreachable from their page's roots.
 * Returns an empty array when the document is structurally sound.
 */
export function validateSceneGraph(document: ProjectDocument): SceneGraphIssue[] {
  const issues: SceneGraphIssue[] = [];

  for (const pageId of document.pageOrder) {
    if (!document.pages[pageId]) {
      issues.push({ message: `pageOrder references missing page`, pageId });
    }
  }

  for (const [elementId, element] of Object.entries(document.elements)) {
    if (!document.pages[element.pageId]) {
      issues.push({
        message: `element references missing page`,
        elementId,
        pageId: element.pageId,
      });
      continue;
    }

    if (element.parentId !== null) {
      const parent = document.elements[element.parentId];
      if (!parent) {
        issues.push({ message: `element parentId references missing element`, elementId });
      } else if (parent.pageId !== element.pageId) {
        issues.push({ message: `element parent belongs to a different page`, elementId });
      } else if (!parent.childIds.includes(elementId)) {
        issues.push({ message: `element parent does not list it in childIds`, elementId });
      }
    }

    for (const childId of element.childIds) {
      const child = document.elements[childId];
      if (!child) {
        issues.push({ message: `childIds references missing element`, elementId });
      } else if (child.parentId !== elementId) {
        issues.push({
          message: `child element does not point back to this parent`,
          elementId: childId,
        });
      } else if (child.pageId !== element.pageId) {
        issues.push({ message: `child element belongs to a different page`, elementId: childId });
      }
    }
  }

  for (const [pageId, page] of Object.entries(document.pages)) {
    for (const rootId of page.rootElementIds) {
      const root = document.elements[rootId];
      if (!root) {
        issues.push({
          message: `page rootElementIds references missing element`,
          pageId,
          elementId: rootId,
        });
      } else if (root.parentId !== null) {
        issues.push({
          message: `page root element has a non-null parentId`,
          pageId,
          elementId: rootId,
        });
      } else if (root.pageId !== pageId) {
        issues.push({
          message: `page root element belongs to a different page`,
          pageId,
          elementId: rootId,
        });
      }
    }
  }

  detectCycles(document, issues);
  detectUnreachableElements(document, issues);

  return issues;
}

function detectCycles(document: ProjectDocument, issues: SceneGraphIssue[]): void {
  const state = new Map<string, "visiting" | "done">();

  function visit(elementId: string): void {
    const status = state.get(elementId);
    if (status === "done") return;
    if (status === "visiting") {
      issues.push({ message: `cycle detected in element tree`, elementId });
      return;
    }
    state.set(elementId, "visiting");
    const element = document.elements[elementId];
    if (element) {
      for (const childId of element.childIds) {
        if (document.elements[childId]) visit(childId);
      }
    }
    state.set(elementId, "done");
  }

  for (const elementId of Object.keys(document.elements)) {
    visit(elementId);
  }
}

function detectUnreachableElements(document: ProjectDocument, issues: SceneGraphIssue[]): void {
  const reachable = new Set<string>();
  for (const pageId of Object.keys(document.pages)) {
    traversePage(document, pageId, (element) => reachable.add(element.id));
  }
  for (const elementId of Object.keys(document.elements)) {
    if (!reachable.has(elementId)) {
      issues.push({ message: `element is unreachable from any page root`, elementId });
    }
  }
}
