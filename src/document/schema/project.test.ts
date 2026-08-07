import { describe, expect, it } from "vitest";
import { projectDocumentSchema } from "@/document/schema/project";
import { fixtureProjectDocument } from "@/document/schema/fixtures";

describe("projectDocumentSchema", () => {
  it("accepts the representative fixture document", () => {
    expect(() => projectDocumentSchema.parse(fixtureProjectDocument)).not.toThrow();
  });

  it("accepts each element kind present in the fixture", () => {
    const kinds = Object.values(fixtureProjectDocument.elements).map((element) => element.kind);
    expect(new Set(kinds)).toEqual(
      new Set(["group", "shape", "text", "polygon", "image", "path", "sprite"]),
    );
  });

  it("rejects an unrecognized top-level field", () => {
    const invalid = { ...fixtureProjectDocument, unexpectedField: "nope" };
    expect(() => projectDocumentSchema.parse(invalid)).toThrow();
  });

  it("rejects an element whose kind does not match its content.kind", () => {
    const invalid = {
      ...fixtureProjectDocument,
      elements: {
        ...fixtureProjectDocument.elements,
        "hero-shape": { ...fixtureProjectDocument.elements["hero-shape"], kind: "text" },
      },
    };
    expect(() => projectDocumentSchema.parse(invalid)).toThrow();
  });

  it("rejects a non-finite numeric value", () => {
    const invalid = {
      ...fixtureProjectDocument,
      elements: {
        ...fixtureProjectDocument.elements,
        "hero-shape": {
          ...fixtureProjectDocument.elements["hero-shape"],
          base: {
            ...fixtureProjectDocument.elements["hero-shape"]!.base,
            opacity: Number.POSITIVE_INFINITY,
          },
        },
      },
    };
    expect(() => projectDocumentSchema.parse(invalid)).toThrow();
  });

  it("rejects an opacity value outside 0..1", () => {
    const invalid = {
      ...fixtureProjectDocument,
      elements: {
        ...fixtureProjectDocument.elements,
        "hero-shape": {
          ...fixtureProjectDocument.elements["hero-shape"],
          base: { ...fixtureProjectDocument.elements["hero-shape"]!.base, opacity: 1.5 },
        },
      },
    };
    expect(() => projectDocumentSchema.parse(invalid)).toThrow();
  });

  it("rejects a fill color that is not a hex value", () => {
    const invalid = {
      ...fixtureProjectDocument,
      elements: {
        ...fixtureProjectDocument.elements,
        "hero-shape": {
          ...fixtureProjectDocument.elements["hero-shape"],
          base: {
            ...fixtureProjectDocument.elements["hero-shape"]!.base,
            fill: { type: "solid", color: "red" },
          },
        },
      },
    };
    expect(() => projectDocumentSchema.parse(invalid)).toThrow();
  });

  it("rejects a sprite with zero frames", () => {
    const invalid = {
      ...fixtureProjectDocument,
      elements: {
        ...fixtureProjectDocument.elements,
        "hero-sprite": {
          ...fixtureProjectDocument.elements["hero-sprite"],
          content: { ...fixtureProjectDocument.elements["hero-sprite"]!.content, frames: [] },
        },
      },
    };
    expect(() => projectDocumentSchema.parse(invalid)).toThrow();
  });

  it("rejects duplicate keyframe offsets within a track", () => {
    const invalid = {
      ...fixtureProjectDocument,
      animations: {
        "hero-group:desktop": {
          elementId: "hero-group",
          viewport: "desktop",
          tracks: {
            opacity: {
              property: "opacity",
              keyframes: [
                { id: "a", offsetPx: 0, value: 0, easing: { type: "linear" } },
                { id: "b", offsetPx: 0, value: 1, easing: { type: "linear" } },
              ],
            },
          },
        },
      },
    };
    expect(() => projectDocumentSchema.parse(invalid)).toThrow();
  });
});
