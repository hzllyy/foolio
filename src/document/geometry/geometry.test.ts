import { describe, expect, it } from "vitest";
import { resolveElementStyle, resolveViewportForWidth } from "@/document/geometry";
import { fixtureProjectDocument } from "@/document/schema/fixtures";

describe("resolveViewportForWidth", () => {
  it("resolves widths at or above the breakpoint to desktop", () => {
    expect(resolveViewportForWidth(768, 768)).toBe("desktop");
    expect(resolveViewportForWidth(1440, 768)).toBe("desktop");
  });

  it("resolves widths below the breakpoint to mobile", () => {
    expect(resolveViewportForWidth(767, 768)).toBe("mobile");
    expect(resolveViewportForWidth(390, 768)).toBe("mobile");
  });
});

describe("resolveElementStyle", () => {
  const element = fixtureProjectDocument.elements["hero-shape"]!;

  it("returns the base style for desktop", () => {
    expect(resolveElementStyle(element, "desktop")).toEqual(element.base);
  });

  it("merges the mobile override onto the base style", () => {
    const resolved = resolveElementStyle(element, "mobile");
    expect(resolved.x).toBe(8);
    expect(resolved.width).toBe(160);
    expect(resolved.height).toBe(element.base.height);
    expect(resolved.fill).toEqual(element.base.fill);
  });

  it("returns the base style for mobile when no override exists", () => {
    const element2 = fixtureProjectDocument.elements["hero-text"]!;
    expect(resolveElementStyle(element2, "mobile")).toEqual(element2.base);
  });
});
