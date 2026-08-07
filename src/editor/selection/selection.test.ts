import { describe, expect, it } from "vitest";
import { getSelectionBounds } from "@/editor/selection";
import { fixtureProjectDocument } from "@/document/schema/fixtures";

describe("getSelectionBounds", () => {
  it("returns undefined for an empty selection", () => {
    expect(getSelectionBounds(fixtureProjectDocument, [], "desktop")).toBeUndefined();
  });

  it("returns a single element's bounds for a one-element selection", () => {
    expect(getSelectionBounds(fixtureProjectDocument, ["hero-group"], "desktop")).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 240,
    });
  });

  it("returns the union bounding box for a multi-element selection", () => {
    // hero-group: x0 y0 400x240 -> right 400, bottom 240
    // hero-polygon: x420 y0 120x120 -> right 540, bottom 120
    expect(
      getSelectionBounds(fixtureProjectDocument, ["hero-group", "hero-polygon"], "desktop"),
    ).toEqual({
      x: 0,
      y: 0,
      width: 540,
      height: 240,
    });
  });
});
