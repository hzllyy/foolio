import { describe, expect, it } from "vitest";
import { selectSpriteFrameIndex } from "@/renderer/runtime";

describe("selectSpriteFrameIndex", () => {
  const playback = { startOffsetPx: 0, endOffsetPx: 100, behavior: "clamp" as const };

  it("selects the first frame at the start offset", () => {
    expect(selectSpriteFrameIndex(playback, 4, 0)).toBe(0);
  });

  it("selects the last frame at the end offset", () => {
    expect(selectSpriteFrameIndex(playback, 4, 100)).toBe(3);
  });

  it("selects the last frame beyond the end offset (clamp)", () => {
    expect(selectSpriteFrameIndex(playback, 4, 500)).toBe(3);
  });

  it("selects the first frame before the start offset (clamp)", () => {
    expect(selectSpriteFrameIndex(playback, 4, -50)).toBe(0);
  });

  it("steps evenly across the midpoint", () => {
    expect(selectSpriteFrameIndex(playback, 4, 50)).toBe(2);
  });

  it("returns -1 when there are no frames", () => {
    expect(selectSpriteFrameIndex(playback, 0, 50)).toBe(-1);
  });

  it("does not divide by zero when start and end offsets are equal", () => {
    const zeroSpan = { startOffsetPx: 50, endOffsetPx: 50, behavior: "clamp" as const };
    expect(selectSpriteFrameIndex(zeroSpan, 4, 50)).toBe(3);
  });
});
