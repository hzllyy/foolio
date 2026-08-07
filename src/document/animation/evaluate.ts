import type { AnimationTrack } from "@/document/schema/animation";

const EASE_FUNCTIONS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  "ease-in": (t) => t * t,
  "ease-out": (t) => 1 - (1 - t) * (1 - t),
  "ease-in-out": (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

function ease(track: AnimationTrack, segmentStartIndex: number, t: number): number {
  const easing = track.keyframes[segmentStartIndex]!.easing;
  if (easing.type === "cubic-bezier") {
    // First release approximates cubic-bezier easing with ease-in-out until a full solver ships.
    return EASE_FUNCTIONS["ease-in-out"]!(t);
  }
  return (EASE_FUNCTIONS[easing.type] ?? EASE_FUNCTIONS.linear!)(t);
}

/**
 * Evaluates an animation track's value at a given scroll offset (CSS pixels).
 * Keyframes must be sorted by offsetPx. Values clamp to the nearest endpoint
 * outside the track's range, per docs/data-model.md section 6.
 */
export function evaluateTrack(track: AnimationTrack, offsetPx: number): number | undefined {
  const keyframes = track.keyframes;
  if (keyframes.length === 0) return undefined;
  if (keyframes.length === 1) {
    const only = keyframes[0]!;
    // A lone keyframe should not freeze the property across the whole timeline.
    // It only applies at its authored offset; elsewhere the caller should fall back
    // to the resolved (non-animated) style so users can continue authoring poses.
    return offsetPx === only.offsetPx ? only.value : undefined;
  }

  const first = keyframes[0]!;
  const last = keyframes[keyframes.length - 1]!;
  if (offsetPx <= first.offsetPx) return first.value;
  if (offsetPx >= last.offsetPx) return last.value;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const start = keyframes[i]!;
    const end = keyframes[i + 1]!;
    if (offsetPx >= start.offsetPx && offsetPx <= end.offsetPx) {
      const span = end.offsetPx - start.offsetPx;
      const t = span === 0 ? 0 : (offsetPx - start.offsetPx) / span;
      const easedT = ease(track, i, t);
      return start.value + easedT * (end.value - start.value);
    }
  }

  return last.value;
}
