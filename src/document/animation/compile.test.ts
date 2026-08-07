import { describe, expect, it } from "vitest";
import {
  compileTrack,
  evaluateElementAnimation,
  selectReducedMotionValue,
} from "@/document/animation/compile";
import type { AnimationTrack, ElementAnimation } from "@/document/schema";

describe("compileTrack", () => {
  it("sorts keyframes by offsetPx without mutating the input", () => {
    const track: AnimationTrack = {
      property: "opacity",
      keyframes: [
        { id: "b", offsetPx: 100, value: 1, easing: { type: "linear" } },
        { id: "a", offsetPx: 0, value: 0, easing: { type: "linear" } },
      ],
    };
    const compiled = compileTrack(track);
    expect(compiled.keyframes.map((k) => k.id)).toEqual(["a", "b"]);
    expect(track.keyframes.map((k) => k.id)).toEqual(["b", "a"]);
  });
});

describe("evaluateElementAnimation", () => {
  const animations: Record<string, ElementAnimation> = {
    "el-1:desktop": {
      elementId: "el-1",
      viewport: "desktop",
      tracks: {
        opacity: {
          property: "opacity",
          keyframes: [
            { id: "a", offsetPx: 0, value: 0, easing: { type: "linear" } },
            { id: "b", offsetPx: 100, value: 1, easing: { type: "linear" } },
          ],
        },
      },
    },
    "el-1:mobile": {
      elementId: "el-1",
      viewport: "mobile",
      tracks: {
        x: {
          property: "x",
          keyframes: [{ id: "c", offsetPx: 0, value: 50, easing: { type: "linear" } }],
        },
      },
    },
  };

  it("evaluates the track for the requested viewport when present", () => {
    expect(evaluateElementAnimation(animations, "el-1", "mobile", "x", 0)).toBe(50);
  });

  it("falls back to the desktop track when the mobile viewport has no track for the property", () => {
    expect(evaluateElementAnimation(animations, "el-1", "mobile", "opacity", 50)).toBe(0.5);
  });

  it("returns undefined when neither viewport animates the property", () => {
    expect(evaluateElementAnimation(animations, "el-1", "mobile", "height", 50)).toBeUndefined();
  });

  it("does not fall back from mobile to desktop for the desktop viewport itself", () => {
    expect(evaluateElementAnimation(animations, "el-1", "desktop", "x", 50)).toBeUndefined();
  });
});

describe("selectReducedMotionValue", () => {
  const track: AnimationTrack = {
    property: "opacity",
    keyframes: [
      { id: "a", offsetPx: 100, value: 0.25, easing: { type: "linear" } },
      { id: "b", offsetPx: 0, value: 1, easing: { type: "linear" } },
    ],
  };

  it("returns the base value for the base pose", () => {
    expect(selectReducedMotionValue(0.9, track, "base")).toBe(0.9);
  });

  it("returns the earliest keyframe's value for the first-keyframe pose", () => {
    expect(selectReducedMotionValue(0.9, track, "first-keyframe")).toBe(1);
  });

  it("falls back to the base value when there is no track", () => {
    expect(selectReducedMotionValue(0.9, undefined, "first-keyframe")).toBe(0.9);
  });
});
