import { describe, expect, it } from "vitest";
import { evaluateTrack } from "@/document/animation/evaluate";
import type { AnimationTrack } from "@/document/schema/animation";

function track(overrides: Partial<AnimationTrack> = {}): AnimationTrack {
  return {
    property: "x",
    keyframes: [
      { id: "a", offsetPx: 0, value: 0, easing: { type: "linear" } },
      { id: "b", offsetPx: 100, value: 200, easing: { type: "linear" } },
    ],
    ...overrides,
  };
}

describe("evaluateTrack", () => {
  it("returns the exact value at the first keyframe", () => {
    expect(evaluateTrack(track(), 0)).toBe(0);
  });

  it("returns the exact value at the last keyframe", () => {
    expect(evaluateTrack(track(), 100)).toBe(200);
  });

  it("returns the linear midpoint between two keyframes", () => {
    expect(evaluateTrack(track(), 50)).toBe(100);
  });

  it("clamps below the first keyframe", () => {
    expect(evaluateTrack(track(), -50)).toBe(0);
  });

  it("clamps above the last keyframe", () => {
    expect(evaluateTrack(track(), 500)).toBe(200);
  });

  it("returns undefined for a track with no keyframes", () => {
    expect(evaluateTrack(track({ keyframes: [] }), 10)).toBeUndefined();
  });

  it("applies a single keyframe only at its exact offset", () => {
    const single = track({
      keyframes: [{ id: "a", offsetPx: 40, value: 12, easing: { type: "linear" } }],
    });
    expect(evaluateTrack(single, 40)).toBe(12);
    expect(evaluateTrack(single, 0)).toBeUndefined();
    expect(evaluateTrack(single, 999)).toBeUndefined();
  });

  it("interpolates across three keyframes using the correct segment", () => {
    const multi = track({
      keyframes: [
        { id: "a", offsetPx: 0, value: 0, easing: { type: "linear" } },
        { id: "b", offsetPx: 100, value: 100, easing: { type: "linear" } },
        { id: "c", offsetPx: 200, value: 0, easing: { type: "linear" } },
      ],
    });
    expect(evaluateTrack(multi, 150)).toBe(50);
  });
});
