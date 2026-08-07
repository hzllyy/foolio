import { describe, expect, it } from "vitest";
import { applyPatches } from "immer";
import { applyCommand } from "@/editor/commands/apply";
import { InvalidCommandError } from "@/editor/commands/types";
import { fixtureProjectDocument } from "@/document/schema/fixtures";
import { elementAnimationKey } from "@/document/schema";
import { validateSceneGraph } from "@/document/schema/scene-graph";
import type { ElementStyle, ProjectDocument } from "@/document/schema";

const baseStyle: ElementStyle = { x: 10, y: 10, width: 50, height: 50, rotationDeg: 0, opacity: 1 };

describe("element.create", () => {
  it("creates a root element and appends it to the page's rootElementIds", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "element.create",
      payload: {
        id: "new-shape",
        pageId: "page-1",
        parentId: null,
        kind: "shape",
        name: "New shape",
        base: baseStyle,
        content: { kind: "shape", shape: "rectangle" },
      },
    });

    expect(document.elements["new-shape"]).toBeDefined();
    expect(document.pages["page-1"]!.rootElementIds.at(-1)).toBe("new-shape");
    expect(validateSceneGraph(document)).toEqual([]);
  });

  it("creates a child element under an existing parent at a given index", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "element.create",
      payload: {
        id: "new-child",
        pageId: "page-1",
        parentId: "hero-group",
        index: 0,
        kind: "shape",
        name: "New child",
        base: baseStyle,
        content: { kind: "shape", shape: "rectangle" },
      },
    });

    expect(document.elements["hero-group"]!.childIds[0]).toBe("new-child");
    expect(document.elements["new-child"]!.parentId).toBe("hero-group");
    expect(validateSceneGraph(document)).toEqual([]);
  });

  it("rejects creating an element with an ID that already exists", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "element.create",
        payload: {
          id: "hero-shape",
          pageId: "page-1",
          parentId: null,
          kind: "shape",
          name: "Dup",
          base: baseStyle,
          content: { kind: "shape", shape: "rectangle" },
        },
      }),
    ).toThrow(InvalidCommandError);
  });

  it("rejects a parent on a different page", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "element.create",
        payload: {
          id: "new-shape",
          pageId: "does-not-exist",
          parentId: "hero-group",
          kind: "shape",
          name: "New shape",
          base: baseStyle,
          content: { kind: "shape", shape: "rectangle" },
        },
      }),
    ).toThrow(InvalidCommandError);
  });

  it("rejects an element that fails schema validation", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "element.create",
        payload: {
          id: "new-shape",
          pageId: "page-1",
          parentId: null,
          kind: "shape",
          name: "New shape",
          base: { ...baseStyle, opacity: 5 },
          content: { kind: "shape", shape: "rectangle" },
        },
      }),
    ).toThrow();
  });
});

describe("element.patch", () => {
  it("merges base style fields without clobbering untouched fields", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "element.patch",
      payload: { elementId: "hero-shape", base: { x: 42 } },
    });
    expect(document.elements["hero-shape"]!.base.x).toBe(42);
    expect(document.elements["hero-shape"]!.base.width).toBe(200);
  });

  it("sets and clears a mobile viewport override", () => {
    const { document: withOverride } = applyCommand(fixtureProjectDocument, {
      type: "element.patch",
      payload: { elementId: "hero-text", mobileOverride: { x: 5 } },
    });
    expect(withOverride.elements["hero-text"]!.viewportOverrides.mobile).toEqual({ x: 5 });

    const { document: cleared } = applyCommand(withOverride, {
      type: "element.patch",
      payload: { elementId: "hero-text", mobileOverride: null },
    });
    expect(cleared.elements["hero-text"]!.viewportOverrides.mobile).toBeUndefined();
  });

  it("rejects patching an unknown element", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "element.patch",
        payload: { elementId: "does-not-exist", name: "x" },
      }),
    ).toThrow(InvalidCommandError);
  });

  it("rejects a patch that would produce an invalid element", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "element.patch",
        payload: { elementId: "hero-shape", base: { opacity: -1 } },
      }),
    ).toThrow();
  });
});

describe("element.delete", () => {
  it("removes an element, its descendants, and its animations", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "element.delete",
      payload: { elementId: "hero-group" },
    });

    expect(document.elements["hero-group"]).toBeUndefined();
    expect(document.elements["hero-shape"]).toBeUndefined();
    expect(document.elements["hero-text"]).toBeUndefined();
    expect(document.pages["page-1"]!.rootElementIds).not.toContain("hero-group");
    expect(document.animations["hero-group:desktop"]).toBeUndefined();
    expect(validateSceneGraph(document)).toEqual([]);
  });

  it("rejects deleting an unknown element", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "element.delete",
        payload: { elementId: "nope" },
      }),
    ).toThrow(InvalidCommandError);
  });
});

describe("element.reparent", () => {
  it("moves an element from page root into another element's children", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "element.reparent",
      payload: { elementId: "hero-polygon", newParentId: "hero-group", index: 0 },
    });

    expect(document.elements["hero-polygon"]!.parentId).toBe("hero-group");
    expect(document.elements["hero-group"]!.childIds[0]).toBe("hero-polygon");
    expect(document.pages["page-1"]!.rootElementIds).not.toContain("hero-polygon");
    expect(validateSceneGraph(document)).toEqual([]);
  });

  it("moves an element back to page root", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "element.reparent",
      payload: { elementId: "hero-shape", newParentId: null, index: 0 },
    });

    expect(document.elements["hero-shape"]!.parentId).toBeNull();
    expect(document.pages["page-1"]!.rootElementIds[0]).toBe("hero-shape");
    expect(document.elements["hero-group"]!.childIds).not.toContain("hero-shape");
    expect(validateSceneGraph(document)).toEqual([]);
  });

  it("rejects reparenting an element into itself", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "element.reparent",
        payload: { elementId: "hero-group", newParentId: "hero-group", index: 0 },
      }),
    ).toThrow(InvalidCommandError);
  });

  it("rejects reparenting an element into its own descendant", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "element.reparent",
        payload: { elementId: "hero-group", newParentId: "hero-shape", index: 0 },
      }),
    ).toThrow(InvalidCommandError);
  });
});

describe("page.resize", () => {
  it("patches the requested viewport's scroll length", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "page.resize",
      payload: { pageId: "page-1", viewport: "desktop", scrollLengthPx: 900 },
    });
    expect(document.pages["page-1"]!.viewports.desktop.scrollLengthPx).toBe(900);
    expect(document.pages["page-1"]!.viewports.mobile.scrollLengthPx).toBe(400);
  });

  it("rejects resizing an unknown page", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "page.resize",
        payload: { pageId: "nope", viewport: "desktop", scrollLengthPx: 900 },
      }),
    ).toThrow(InvalidCommandError);
  });
});

describe("page.create", () => {
  it("appends a blank page with default viewports", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "page.create",
      payload: { id: "page-2", name: "About", slug: "about" },
    });

    expect(document.pageOrder).toEqual(["page-1", "page-2"]);
    expect(document.pages["page-2"]).toMatchObject({
      name: "About",
      slug: "about",
      rootElementIds: [],
    });
    expect(document.pages["page-2"]!.viewports.desktop.widthPx).toBe(1440);
  });

  it("inserts at a given index", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "page.create",
      payload: { id: "page-0", name: "Intro", slug: "intro", index: 0 },
    });
    expect(document.pageOrder).toEqual(["page-0", "page-1"]);
  });

  it("rejects a duplicate page ID", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "page.create",
        payload: { id: "page-1", name: "Dup", slug: "dup" },
      }),
    ).toThrow(InvalidCommandError);
  });

  it("rejects a slug already used by another page", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "page.create",
        payload: { id: "page-2", name: "Home again", slug: "home" },
      }),
    ).toThrow(InvalidCommandError);
  });
});

describe("page.rename", () => {
  it("renames a page", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "page.rename",
      payload: { pageId: "page-1", name: "Landing" },
    });
    expect(document.pages["page-1"]!.name).toBe("Landing");
  });

  it("rejects renaming an unknown page", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "page.rename",
        payload: { pageId: "nope", name: "x" },
      }),
    ).toThrow(InvalidCommandError);
  });
});

describe("page.delete", () => {
  it("removes a page and all of its elements/animations", () => {
    const { document: withSecondPage } = applyCommand(fixtureProjectDocument, {
      type: "page.create",
      payload: { id: "page-2", name: "About", slug: "about" },
    });
    const { document } = applyCommand(withSecondPage, {
      type: "page.delete",
      payload: { pageId: "page-1" },
    });

    expect(document.pages["page-1"]).toBeUndefined();
    expect(document.pageOrder).toEqual(["page-2"]);
    expect(document.elements["hero-group"]).toBeUndefined();
    expect(document.animations["hero-group:desktop"]).toBeUndefined();
  });

  it("rejects deleting the only page in a project", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "page.delete",
        payload: { pageId: "page-1" },
      }),
    ).toThrow(InvalidCommandError);
  });
});

describe("page.reorder", () => {
  it("moves a page to a new index in pageOrder", () => {
    const { document: withPages } = applyCommand(fixtureProjectDocument, {
      type: "page.create",
      payload: { id: "page-2", name: "About", slug: "about" },
    });
    const { document: withThree } = applyCommand(withPages, {
      type: "page.create",
      payload: { id: "page-3", name: "Contact", slug: "contact" },
    });
    expect(withThree.pageOrder).toEqual(["page-1", "page-2", "page-3"]);

    const { document } = applyCommand(withThree, {
      type: "page.reorder",
      payload: { pageId: "page-3", index: 0 },
    });
    expect(document.pageOrder).toEqual(["page-3", "page-1", "page-2"]);
  });
});

describe("page.duplicate", () => {
  it("deep-clones a page's elements and animations under new IDs", () => {
    const elementIdMap = {
      "hero-group": "hero-group-2",
      "hero-shape": "hero-shape-2",
      "hero-text": "hero-text-2",
      "hero-polygon": "hero-polygon-2",
      "hero-image": "hero-image-2",
      "hero-path": "hero-path-2",
      "hero-sprite": "hero-sprite-2",
    };

    const { document } = applyCommand(fixtureProjectDocument, {
      type: "page.duplicate",
      payload: {
        sourcePageId: "page-1",
        newPageId: "page-2",
        name: "Home copy",
        slug: "home-copy",
        elementIdMap,
      },
    });

    expect(document.pageOrder).toEqual(["page-1", "page-2"]);
    expect(document.pages["page-2"]!.name).toBe("Home copy");
    expect(document.pages["page-2"]!.rootElementIds).toEqual([
      "hero-group-2",
      "hero-polygon-2",
      "hero-image-2",
      "hero-path-2",
      "hero-sprite-2",
    ]);

    const clonedGroup = document.elements["hero-group-2"]!;
    expect(clonedGroup.pageId).toBe("page-2");
    expect(clonedGroup.childIds).toEqual(["hero-shape-2", "hero-text-2"]);
    expect(document.elements["hero-shape-2"]!.parentId).toBe("hero-group-2");

    // original page/elements are untouched
    expect(document.pages["page-1"]!.rootElementIds).toContain("hero-group");
    expect(document.elements["hero-group"]).toBeDefined();
    expect(validateSceneGraph(document)).toEqual([]);
  });

  it("rejects an incomplete element ID map", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "page.duplicate",
        payload: {
          sourcePageId: "page-1",
          newPageId: "page-2",
          name: "Home copy",
          slug: "home-copy",
          elementIdMap: { "hero-group": "hero-group-2" },
        },
      }),
    ).toThrow(InvalidCommandError);
  });

  it("rejects a duplicate slug", () => {
    expect(() =>
      applyCommand(fixtureProjectDocument, {
        type: "page.duplicate",
        payload: {
          sourcePageId: "page-1",
          newPageId: "page-2",
          name: "Home copy",
          slug: "home",
          elementIdMap: {
            "hero-group": "hero-group-2",
            "hero-shape": "hero-shape-2",
            "hero-text": "hero-text-2",
            "hero-polygon": "hero-polygon-2",
            "hero-image": "hero-image-2",
            "hero-path": "hero-path-2",
            "hero-sprite": "hero-sprite-2",
          },
        },
      }),
    ).toThrow(InvalidCommandError);
  });
});

describe("keyframe.upsert", () => {
  it("creates a new track when one does not exist", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "keyframe.upsert",
      payload: {
        elementId: "hero-shape",
        viewport: "desktop",
        property: "x",
        keyframe: {
          id: "shape-x-1",
          offsetPx: 120,
          value: 24,
          easing: { type: "linear" },
        },
      },
    });

    const animation = document.animations[elementAnimationKey("hero-shape", "desktop")];
    expect(animation?.tracks.x?.keyframes).toEqual([
      { id: "shape-x-1", offsetPx: 120, value: 24, easing: { type: "linear" } },
    ]);
  });

  it("replaces a keyframe at the same offset to keep collisions deterministic", () => {
    const key = elementAnimationKey("hero-shape", "desktop");
    const seeded: ProjectDocument = {
      ...fixtureProjectDocument,
      animations: {
        ...fixtureProjectDocument.animations,
        [key]: {
          elementId: "hero-shape",
          viewport: "desktop",
          tracks: {
            x: {
              property: "x",
              keyframes: [{ id: "old", offsetPx: 50, value: 10, easing: { type: "linear" } }],
            },
          },
        },
      },
    };

    const { document } = applyCommand(seeded, {
      type: "keyframe.upsert",
      payload: {
        elementId: "hero-shape",
        viewport: "desktop",
        property: "x",
        keyframe: {
          id: "new",
          offsetPx: 50,
          value: 99,
          easing: { type: "linear" },
        },
      },
    });

    expect(document.animations[key]?.tracks.x?.keyframes).toEqual([
      { id: "new", offsetPx: 50, value: 99, easing: { type: "linear" } },
    ]);
  });

  it("moving an existing keyframe onto another keyframe offset keeps only one keyframe at that offset", () => {
    const key = elementAnimationKey("hero-shape", "desktop");
    const seeded: ProjectDocument = {
      ...fixtureProjectDocument,
      animations: {
        ...fixtureProjectDocument.animations,
        [key]: {
          elementId: "hero-shape",
          viewport: "desktop",
          tracks: {
            x: {
              property: "x",
              keyframes: [
                { id: "dragged", offsetPx: 10, value: 1, easing: { type: "linear" } },
                { id: "target", offsetPx: 50, value: 2, easing: { type: "linear" } },
              ],
            },
          },
        },
      },
    };

    const { document } = applyCommand(seeded, {
      type: "keyframe.upsert",
      payload: {
        elementId: "hero-shape",
        viewport: "desktop",
        property: "x",
        keyframe: {
          id: "dragged",
          offsetPx: 50,
          value: 9,
          easing: { type: "linear" },
        },
      },
    });

    expect(document.animations[key]?.tracks.x?.keyframes).toEqual([
      { id: "dragged", offsetPx: 50, value: 9, easing: { type: "linear" } },
    ]);
  });
});

describe("keyframe.delete", () => {
  it("removes a keyframe and deletes empty track + animation containers", () => {
    const key = elementAnimationKey("hero-shape", "desktop");
    const seeded: ProjectDocument = {
      ...fixtureProjectDocument,
      animations: {
        ...fixtureProjectDocument.animations,
        [key]: {
          elementId: "hero-shape",
          viewport: "desktop",
          tracks: {
            x: {
              property: "x",
              keyframes: [{ id: "solo", offsetPx: 10, value: 1, easing: { type: "linear" } }],
            },
          },
        },
      },
    };

    const { document } = applyCommand(seeded, {
      type: "keyframe.delete",
      payload: {
        elementId: "hero-shape",
        viewport: "desktop",
        property: "x",
        keyframeId: "solo",
      },
    });

    expect(document.animations[key]).toBeUndefined();
  });
});

describe("patches and inversePatches", () => {
  it("round-trips back to the original document via applyPatches(inversePatches)", () => {
    const { document, inversePatches } = applyCommand(fixtureProjectDocument, {
      type: "element.patch",
      payload: { elementId: "hero-shape", base: { x: 999 } },
    });
    expect(document.elements["hero-shape"]!.base.x).toBe(999);

    const restored = applyPatches(document, inversePatches);
    expect(restored).toEqual(fixtureProjectDocument);
  });
});
