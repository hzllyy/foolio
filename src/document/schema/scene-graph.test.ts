import { describe, expect, it } from "vitest";
import {
  validateSceneGraph,
  getOrderedChildren,
  getRootElements,
  traversePage,
} from "@/document/schema/scene-graph";
import { fixtureProjectDocument } from "@/document/schema/fixtures";
import type { ProjectDocument } from "@/document/schema/project";

describe("validateSceneGraph", () => {
  it("reports no issues for the representative fixture", () => {
    expect(validateSceneGraph(fixtureProjectDocument)).toEqual([]);
  });

  it("detects a childIds reference to a missing element", () => {
    const doc: ProjectDocument = {
      ...fixtureProjectDocument,
      elements: {
        ...fixtureProjectDocument.elements,
        "hero-group": {
          ...fixtureProjectDocument.elements["hero-group"]!,
          childIds: [...fixtureProjectDocument.elements["hero-group"]!.childIds, "does-not-exist"],
        },
      },
    };
    const issues = validateSceneGraph(doc);
    expect(issues.some((issue) => issue.message.includes("missing element"))).toBe(true);
  });

  it("detects cross-page parenting", () => {
    const doc: ProjectDocument = {
      ...fixtureProjectDocument,
      pageOrder: ["page-1", "page-2"],
      pages: {
        ...fixtureProjectDocument.pages,
        "page-2": {
          id: "page-2",
          name: "Other",
          slug: "other",
          rootElementIds: [],
          viewports: fixtureProjectDocument.pages["page-1"]!.viewports,
        },
      },
      elements: {
        ...fixtureProjectDocument.elements,
        "hero-text": { ...fixtureProjectDocument.elements["hero-text"]!, pageId: "page-2" },
      },
    };
    const issues = validateSceneGraph(doc);
    expect(issues.some((issue) => issue.message.includes("different page"))).toBe(true);
  });

  it("detects a cycle in the element tree", () => {
    const doc: ProjectDocument = {
      ...fixtureProjectDocument,
      elements: {
        ...fixtureProjectDocument.elements,
        "hero-group": {
          ...fixtureProjectDocument.elements["hero-group"]!,
          parentId: "hero-text",
        },
        "hero-text": {
          ...fixtureProjectDocument.elements["hero-text"]!,
          parentId: "hero-group",
          childIds: ["hero-group"],
        },
      },
    };
    const issues = validateSceneGraph(doc);
    expect(issues.some((issue) => issue.message.includes("cycle"))).toBe(true);
  });

  it("detects an element unreachable from any page root", () => {
    const doc: ProjectDocument = {
      ...fixtureProjectDocument,
      elements: {
        ...fixtureProjectDocument.elements,
        "orphan-shape": {
          ...fixtureProjectDocument.elements["hero-shape"]!,
          id: "orphan-shape",
          parentId: null,
        },
      },
    };
    const issues = validateSceneGraph(doc);
    expect(issues.some((issue) => issue.elementId === "orphan-shape")).toBe(true);
  });
});

describe("traversal helpers", () => {
  it("returns root elements in authored order", () => {
    const roots = getRootElements(fixtureProjectDocument, "page-1").map((element) => element.id);
    expect(roots).toEqual(fixtureProjectDocument.pages["page-1"]!.rootElementIds);
  });

  it("returns children in authored order", () => {
    const children = getOrderedChildren(fixtureProjectDocument, "hero-group").map(
      (element) => element.id,
    );
    expect(children).toEqual(["hero-shape", "hero-text"]);
  });

  it("visits every element exactly once in depth-first paint order", () => {
    const visited: string[] = [];
    traversePage(fixtureProjectDocument, "page-1", (element) => visited.push(element.id));
    expect(visited).toEqual([
      "hero-group",
      "hero-shape",
      "hero-text",
      "hero-polygon",
      "hero-image",
      "hero-path",
      "hero-sprite",
    ]);
  });
});
