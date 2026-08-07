"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./perf-spike.module.css";

const ELEMENT_COUNT = 200;
const GRID_COLUMNS = 20;
const CELL_SIZE_PX = 56;

function ElementGrid({
  startedAt,
  onMeasured,
}: {
  startedAt: number;
  onMeasured: (ms: number) => void;
}) {
  useLayoutEffect(() => {
    onMeasured(performance.now() - startedAt);
    // Measures once per mount (remount is triggered by changing the parent's `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.grid}>
      {Array.from({ length: ELEMENT_COUNT }, (_, i) => (
        <div
          key={i}
          className={styles.cell}
          style={{
            transform: `translate(${(i % GRID_COLUMNS) * CELL_SIZE_PX}px, ${Math.floor(i / GRID_COLUMNS) * CELL_SIZE_PX}px)`,
          }}
        >
          {i}
        </div>
      ))}
    </div>
  );
}

/**
 * Phase 0 risk prototype measuring mount cost and scroll FPS for 200 absolutely
 * positioned elements. See docs/implementation-plan.md Phase 0.
 */
export function PerfSpike() {
  const [runId, setRunId] = useState(0);
  const [startedAt, setStartedAt] = useState(() => performance.now());
  const [mountMs, setMountMs] = useState<number | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const frameCountRef = useRef(0);
  const windowStartRef = useRef(0);

  function remount() {
    setMountMs(null);
    setStartedAt(performance.now());
    setRunId((id) => id + 1);
  }

  useEffect(() => {
    let rafId: number;
    frameCountRef.current = 0;
    windowStartRef.current = performance.now();

    const tick = () => {
      frameCountRef.current += 1;
      const elapsed = performance.now() - windowStartRef.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        windowStartRef.current = performance.now();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div>
      <p>
        <button type="button" onClick={remount}>
          Remount {ELEMENT_COUNT} elements
        </button>
      </p>
      <p>
        Mount to committed layout: {mountMs === null ? "measuring..." : `${mountMs.toFixed(2)}ms`}
      </p>
      <p>Scroll FPS (scroll the stage below): {fps === null ? "measuring..." : fps}</p>
      <div className={styles.stage}>
        <ElementGrid key={runId} startedAt={startedAt} onMeasured={setMountMs} />
      </div>
    </div>
  );
}
