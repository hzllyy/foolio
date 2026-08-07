"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { AnimatableProperty } from "@/document/schema";
import { elementAnimationKey } from "@/document/schema";
import { evaluateElementAnimation } from "@/document/animation";
import { resolveElementStyle } from "@/document/geometry";
import { useDocumentState, useEditorStores, useSessionState } from "@/components/builder-shell/EditorShell";
import styles from "./TimelinePanel.module.css";

const TRACK_PROPERTIES: AnimatableProperty[] = [
  "x",
  "y",
  "width",
  "height",
  "rotationDeg",
  "opacity",
];

function displayName(property: AnimatableProperty): string {
  switch (property) {
    case "rotationDeg":
      return "rotation";
    default:
      return property;
  }
}

function resolvedPropertyValue(
  property: AnimatableProperty,
  base: ReturnType<typeof resolveElementStyle>,
): number {
  return base[property];
}

type DragState = {
  pointerId: number;
  property: AnimatableProperty;
  keyframeId: string;
  maxOffsetPx: number;
  laneLeft: number;
  laneWidth: number;
  candidateOffsetPx: number;
};

function clampOffsetPx(offsetPx: number, maxOffsetPx: number): number {
  return Math.max(0, Math.min(maxOffsetPx, Math.round(offsetPx)));
}

function offsetPxFromClientX(clientX: number, laneLeft: number, laneWidth: number, maxOffsetPx: number): number {
  if (!Number.isFinite(clientX) || !Number.isFinite(laneLeft) || !Number.isFinite(laneWidth)) {
    return 0;
  }
  if (maxOffsetPx <= 0 || laneWidth <= 0) return 0;
  const t = (clientX - laneLeft) / laneWidth;
  return clampOffsetPx(t * maxOffsetPx, maxOffsetPx);
}

function collisionForOffset(
  keyframes: ReadonlyArray<{ id: string; offsetPx: number }>,
  sourceKeyframeId: string,
  candidateOffsetPx: number,
): string | null {
  const collided = keyframes.find(
    (keyframe) => keyframe.id !== sourceKeyframeId && keyframe.offsetPx === candidateOffsetPx,
  );
  return collided?.id ?? null;
}

/**
 * Phase 4 starter timeline: playhead scrubbing + per-property keyframe markers for one selected element.
 */
export function TimelinePanel() {
  const { documentStore, sessionStore } = useEditorStores();
  const document = useDocumentState((state) => state.document);
  const activePageId = useSessionState((state) => state.activePageId);
  const viewport = useSessionState((state) => state.viewport);
  const selectedElementIds = useSessionState((state) => state.selectedElementIds);
  const playheadOffsetPx = useSessionState((state) => state.playheadOffsetPx);

  const page = document.pages[activePageId];
  const maxOffsetPx = page ? page.viewports[viewport].scrollLengthPx : 0;

  const selectedElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : undefined;
  const selectedElement = selectedElementId ? document.elements[selectedElementId] : undefined;
  const resolvedStyle = selectedElement ? resolveElementStyle(selectedElement, viewport) : undefined;

  const animationKey = selectedElement && elementAnimationKey(selectedElement.id, viewport);
  const animation = animationKey ? document.animations[animationKey] : undefined;

  const tracks = useMemo(() => {
    return TRACK_PROPERTIES.map((property) => {
      const track = animation?.tracks[property];
      return { property, keyframes: track?.keyframes ?? [] };
    });
  }, [animation]);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [scrubDraftOffsetPx, setScrubDraftOffsetPx] = useState<number | null>(null);
  const pendingScrubOffsetPx = useRef<number | null>(null);
  const scrubRafId = useRef<number | null>(null);

  const clampedPlayhead = Math.max(0, Math.min(playheadOffsetPx, maxOffsetPx));
  const displayedPlayhead =
    scrubDraftOffsetPx === null
      ? clampedPlayhead
      : Math.max(0, Math.min(scrubDraftOffsetPx, maxOffsetPx));

  useEffect(() => {
    if (clampedPlayhead !== playheadOffsetPx) {
      sessionStore.getState().setPlayheadOffsetPx(clampedPlayhead);
    }
  }, [clampedPlayhead, playheadOffsetPx, sessionStore]);

  const schedulePlayheadCommit = useCallback(
    (nextOffsetPx: number) => {
      const clamped = clampOffsetPx(nextOffsetPx, maxOffsetPx);
      pendingScrubOffsetPx.current = clamped;
      if (scrubRafId.current !== null) return;
      scrubRafId.current = window.requestAnimationFrame(() => {
        scrubRafId.current = null;
        const pending = pendingScrubOffsetPx.current;
        if (pending === null) return;
        pendingScrubOffsetPx.current = null;
        sessionStore.getState().setPlayheadOffsetPx(pending);
      });
    },
    [maxOffsetPx, sessionStore],
  );

  useEffect(() => {
    return () => {
      if (scrubRafId.current !== null) {
        window.cancelAnimationFrame(scrubRafId.current);
      }
    };
  }, []);

  function endScrub(nextOffsetPx?: number) {
    if (nextOffsetPx !== undefined) {
      const clamped = clampOffsetPx(nextOffsetPx, maxOffsetPx);
      pendingScrubOffsetPx.current = null;
      if (scrubRafId.current !== null) {
        window.cancelAnimationFrame(scrubRafId.current);
        scrubRafId.current = null;
      }
      sessionStore.getState().setPlayheadOffsetPx(clamped);
    }
    setScrubDraftOffsetPx(null);
  }

  const dragCollisionKeyframeId = useMemo(() => {
    if (!dragState || !selectedElement) return null;
    const key = elementAnimationKey(selectedElement.id, viewport);
    const track = document.animations[key]?.tracks[dragState.property];
    const keyframes = track?.keyframes ?? [];
    return collisionForOffset(keyframes, dragState.keyframeId, dragState.candidateOffsetPx);
  }, [document.animations, dragState, selectedElement, viewport]);

  function previewOffsetFor(
    property: AnimatableProperty,
    keyframeId: string,
    offsetPx: number,
  ): number {
    if (!dragState) return offsetPx;
    if (dragState.property !== property || dragState.keyframeId !== keyframeId) return offsetPx;
    return dragState.candidateOffsetPx;
  }

  function commitDrag() {
    if (!dragState || !selectedElement) {
      setDragState(null);
      return;
    }

    const key = elementAnimationKey(selectedElement.id, viewport);
    const track = document.animations[key]?.tracks[dragState.property];
    const sourceKeyframe = track?.keyframes.find((keyframe) => keyframe.id === dragState.keyframeId);
    const nextOffsetPx = dragState.candidateOffsetPx;

    if (sourceKeyframe && sourceKeyframe.offsetPx !== nextOffsetPx) {
      documentStore.getState().dispatch({
        type: "keyframe.upsert",
        payload: {
          elementId: selectedElement.id,
          viewport,
          property: dragState.property,
          keyframe: {
            id: sourceKeyframe.id,
            offsetPx: nextOffsetPx,
            value: sourceKeyframe.value,
            easing: sourceKeyframe.easing,
          },
        },
      });
    }

    setDragState(null);
  }

  function handleKeyframePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    property: AnimatableProperty,
    keyframe: { id: string; offsetPx: number },
  ) {
    const lane = event.currentTarget.parentElement;
    if (!lane) return;
    const rect = lane.getBoundingClientRect();
    const candidateOffsetPx = clampOffsetPx(keyframe.offsetPx, maxOffsetPx);

    event.preventDefault();
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    setDragState({
      pointerId: event.pointerId,
      property,
      keyframeId: keyframe.id,
      maxOffsetPx,
      laneLeft: rect.left,
      laneWidth: rect.width,
      candidateOffsetPx,
    });
  }

  function handleKeyframePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragState) return;
    if (!Number.isFinite(event.clientX)) return;
    const candidateOffsetPx = offsetPxFromClientX(
      event.clientX,
      dragState.laneLeft,
      dragState.laneWidth,
      dragState.maxOffsetPx,
    );
    if (candidateOffsetPx === dragState.candidateOffsetPx) return;
    setDragState({ ...dragState, candidateOffsetPx });
  }

  function handleKeyframePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragState) return;
    event.preventDefault();
    commitDrag();
  }

  function handleKeyframePointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragState) return;
    event.preventDefault();
    setDragState(null);
  }

  return (
    <section className={styles.timeline} aria-label="Timeline">
      <div className={styles.header}>
        <label className={styles.scrubLabel}>
          Playhead: {Math.round(displayedPlayhead)}px
          <input
            className={styles.scrubInput}
            type="range"
            min={0}
            max={Math.max(0, maxOffsetPx)}
            step={1}
            value={displayedPlayhead}
            onPointerDown={() => setScrubDraftOffsetPx(clampedPlayhead)}
            onChange={(event) => {
              const next = Number(event.target.value);
              setScrubDraftOffsetPx(next);
              schedulePlayheadCommit(next);
            }}
            onPointerUp={(event) => endScrub(Number((event.target as HTMLInputElement).value))}
            onPointerCancel={() => endScrub()}
            onBlur={(event) => endScrub(Number((event.target as HTMLInputElement).value))}
          />
        </label>
        <span className={styles.rangeLabel}>0 - {Math.round(maxOffsetPx)}px</span>
      </div>

      {dragCollisionKeyframeId ? (
        <p className={styles.collisionNotice} role="status">
          Collision at {Math.round(dragState?.candidateOffsetPx ?? 0)}px. Release to replace the existing
          keyframe.
        </p>
      ) : null}

      {!selectedElement || !resolvedStyle ? (
        <p className={styles.emptyState}>Select one element to author keyframes.</p>
      ) : (
        <ul className={styles.trackList}>
          {tracks.map(({ property, keyframes }) => {
            const baseValue = resolvedPropertyValue(property, resolvedStyle);
            const animatedValue = evaluateElementAnimation(
              document.animations,
              selectedElement.id,
              viewport,
              property,
              displayedPlayhead,
            );
            const currentValue = animatedValue ?? baseValue;

            return (
              <li key={property} className={styles.trackRow}>
                <div className={styles.trackMeta}>
                  <span className={styles.trackName}>{displayName(property)}</span>
                  <span className={styles.trackValue}>{currentValue.toFixed(2)}</span>
                  <button
                    type="button"
                    className={styles.trackAction}
                    onClick={() => {
                      documentStore.getState().dispatch({
                        type: "keyframe.upsert",
                        payload: {
                          elementId: selectedElement.id,
                          viewport,
                          property,
                          keyframe: {
                            id: crypto.randomUUID(),
                            offsetPx: displayedPlayhead,
                            value: currentValue,
                            easing: { type: "linear" },
                          },
                        },
                      });
                    }}
                  >
                    Add
                  </button>
                </div>
                <div className={styles.trackLane}>
                  {keyframes.map((keyframe) => {
                    const previewOffsetPx = previewOffsetFor(property, keyframe.id, keyframe.offsetPx);
                    const leftPercent =
                      maxOffsetPx <= 0
                        ? 0
                        : Math.max(0, Math.min((previewOffsetPx / maxOffsetPx) * 100, 100));
                    const isDragging =
                      dragState?.property === property && dragState?.keyframeId === keyframe.id;
                    const isColliding = isDragging && dragCollisionKeyframeId !== null;
                    return (
                      <button
                        key={keyframe.id}
                        type="button"
                        className={[
                          styles.keyframe,
                          isDragging ? styles.keyframeDragging : "",
                          isColliding ? styles.keyframeCollision : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{ left: `${leftPercent}%` }}
                        aria-label={`${displayName(property)} keyframe at ${Math.round(previewOffsetPx)}px`}
                        title={`offset ${Math.round(previewOffsetPx)}px, value ${keyframe.value} (alt+click to delete)`}
                        onPointerDown={(event) =>
                          handleKeyframePointerDown(event, property, keyframe)
                        }
                        onPointerMove={handleKeyframePointerMove}
                        onPointerUp={handleKeyframePointerUp}
                        onPointerCancel={handleKeyframePointerCancel}
                        onClick={(event) => {
                          if (!event.altKey) return;
                          documentStore.getState().dispatch({
                            type: "keyframe.delete",
                            payload: {
                              elementId: selectedElement.id,
                              viewport,
                              property,
                              keyframeId: keyframe.id,
                            },
                          });
                        }}
                      />
                    );
                  })}
                  <span
                    className={styles.playheadMarker}
                    style={{ left: `${maxOffsetPx <= 0 ? 0 : (displayedPlayhead / maxOffsetPx) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
