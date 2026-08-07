// Published-site scroll driver: compiles tracks and writes CSS custom properties per rAF tick.
import type { SpritePlayback } from "@/document/schema";

/**
 * Selects the discrete sprite frame index for a scroll offset, per
 * docs/data-model.md section 5: progress is clamped to 0..1 across the
 * playback range, then mapped evenly across the available frames.
 */
export function selectSpriteFrameIndex(
  playback: SpritePlayback,
  frameCount: number,
  scrollOffsetPx: number,
): number {
  if (frameCount <= 0) return -1;
  const span = playback.endOffsetPx - playback.startOffsetPx;
  const t =
    span <= 0 ? 1 : Math.min(1, Math.max(0, (scrollOffsetPx - playback.startOffsetPx) / span));
  return Math.min(frameCount - 1, Math.floor(t * frameCount));
}
