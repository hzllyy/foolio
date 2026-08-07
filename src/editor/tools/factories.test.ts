import { describe, expect, it } from "vitest";
import {
  createDefaultPolygonElement,
  createDefaultShapeElement,
  createDefaultTextElement,
  createImageElement,
  createPenElement,
} from "@/editor/tools/factories";
import { validateUpload } from "@/editor/tools/upload";
import { applyCommand } from "@/editor/commands/apply";
import { fixtureProjectDocument } from "@/document/schema/fixtures";

const at = { id: "el-1", pageId: "page-1", parentId: null as string | null, x: 12, y: 34 };

describe("tool factories", () => {
  it("creates a valid shape element at the click point", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "element.create",
      payload: createDefaultShapeElement(at),
    });
    expect(document.elements["el-1"]!.base.x).toBe(12);
    expect(document.elements["el-1"]!.base.y).toBe(34);
  });

  it("creates a valid text element", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "element.create",
      payload: createDefaultTextElement(at),
    });
    expect(document.elements["el-1"]!.kind).toBe("text");
  });

  it("creates a valid polygon element", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "element.create",
      payload: createDefaultPolygonElement(at),
    });
    expect(document.elements["el-1"]!.kind).toBe("polygon");
  });

  it("creates a valid pen (path) element from captured points", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "element.create",
      payload: createPenElement({
        ...at,
        points: [
          [0, 0],
          [10, 10],
          [20, 0],
        ],
        svgPath: "M0 0 L10 10 L20 0",
      }),
    });
    expect(document.elements["el-1"]!.kind).toBe("path");
    expect(document.elements["el-1"]!.base.width).toBe(20);
  });

  it("creates a valid image element only when given a concrete assetId", () => {
    const { document } = applyCommand(fixtureProjectDocument, {
      type: "element.create",
      payload: createImageElement({
        ...at,
        assetId: "asset-uploaded-1",
        alt: "An image",
        widthPx: 100,
        heightPx: 80,
      }),
    });
    expect(document.elements["el-1"]!.content).toEqual({
      kind: "image",
      assetId: "asset-uploaded-1",
      fit: "cover",
      alt: "An image",
    });
  });
});

describe("validateUpload", () => {
  const pngFile = (size: number) =>
    new File([new Uint8Array(size)], "photo.png", { type: "image/png" });

  it("accepts a small PNG", () => {
    expect(validateUpload(pngFile(1024), 0)).toEqual({ ok: true });
  });

  it("rejects unsupported file types", () => {
    const gif = new File([new Uint8Array(10)], "a.gif", { type: "image/gif" });
    expect(validateUpload(gif, 0).ok).toBe(false);
  });

  it("rejects files over 8MB", () => {
    expect(validateUpload(pngFile(9 * 1024 * 1024), 0).ok).toBe(false);
  });

  it("rejects uploads once the project already has 20 assets", () => {
    expect(validateUpload(pngFile(1024), 20).ok).toBe(false);
  });
});
