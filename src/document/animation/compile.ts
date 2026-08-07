import type { AnimatableProperty, AnimationTrack, ElementAnimation } from "@/document/schema";
import { elementAnimationKey } from "@/document/schema";
import { evaluateTrack } from "./evaluate";

/** Returns a copy of a track with keyframes sorted by offsetPx, ready to evaluate. */
export function compileTrack(track: AnimationTrack): AnimationTrack {
  return { ...track, keyframes: [...track.keyframes].sort((a, b) => a.offsetPx - b.offsetPx) };
}

/**
 * Evaluates one animatable property for an element at a scroll offset. If the
 * requested viewport has no track for the property, falls back to the desktop
 * track evaluated at the same offset (see docs/data-model.md section 6). Returns
 * `undefined` when neither viewport animates the property, meaning the
 * resolved (non-animated) style value should be used as-is.
 */
export function evaluateElementAnimation(
  animations: Record<string, ElementAnimation>,
  elementId: string,
  viewport: "desktop" | "mobile",
  property: AnimatableProperty,
  scrollOffsetPx: number,
): number | undefined {
  const own = animations[elementAnimationKey(elementId, viewport)]?.tracks[property];
  if (own) return evaluateTrack(compileTrack(own), scrollOffsetPx);

  if (viewport === "mobile") {
    const desktop = animations[elementAnimationKey(elementId, "desktop")]?.tracks[property];
    if (desktop) return evaluateTrack(compileTrack(desktop), scrollOffsetPx);
  }

  return undefined;
}

/**
 * Selects the static value used when `prefers-reduced-motion: reduce` is
 * active, per the project's `reducedMotionPose` setting (see docs/data-model.md
 * section 6 and architecture.md section 8). `"base"` keeps the element's
 * authored (non-animated) value; `"first-keyframe"` uses the track's earliest
 * keyframe value when one exists.
 */
export function selectReducedMotionValue(
  baseValue: number,
  track: AnimationTrack | undefined,
  pose: "base" | "first-keyframe",
): number {
  if (pose === "first-keyframe" && track && track.keyframes.length > 0) {
    return compileTrack(track).keyframes[0]!.value;
  }
  return baseValue;
}
