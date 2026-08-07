import { describe, expect, it } from "vitest";
import { createEmptyProject } from "./factories";
import { projectDocumentSchema } from "./project";
import { validateSceneGraph } from "./scene-graph";

describe("createEmptyProject", () => {
  it("produces a schema-valid document with one blank page", () => {
    const document = createEmptyProject("project-1", "My portfolio");

    expect(() => projectDocumentSchema.parse(document)).not.toThrow();
    expect(document.name).toBe("My portfolio");
    expect(document.pageOrder).toHaveLength(1);
    const page = document.pages[document.pageOrder[0]!]!;
    expect(page.rootElementIds).toEqual([]);
    expect(Object.keys(document.elements)).toHaveLength(0);
  });

  it("passes scene graph validation", () => {
    const document = createEmptyProject("project-1");
    expect(validateSceneGraph(document)).toEqual([]);
  });

  it("defaults the name when omitted", () => {
    const document = createEmptyProject("project-1");
    expect(document.name).toBe("Untitled project");
  });
});
