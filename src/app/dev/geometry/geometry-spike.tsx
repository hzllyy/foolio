"use client";

import { useEffect, useRef } from "react";
import Moveable from "moveable";
import Selecto from "selecto";
import styles from "./geometry-spike.module.css";

const BOX_COUNT = 4;

/**
 * Phase 0 risk prototype proving DOM elements can be selected (Selecto) and then
 * dragged, resized, and rotated (Moveable). See docs/implementation-plan.md Phase 0.
 */
export function GeometrySpike() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const targets = Array.from(stage.querySelectorAll<HTMLElement>(`.${styles.box}`));

    const moveable = new Moveable(stage, {
      draggable: true,
      resizable: true,
      rotatable: true,
      keepRatio: false,
      origin: false,
    });

    const selecto = new Selecto({
      container: stage,
      selectableTargets: targets,
      selectByClick: true,
      selectFromInside: false,
      hitRate: 0,
    });

    selecto.on("dragStart", (e) => {
      const inputTarget = e.inputEvent.target as HTMLElement;
      // Only let Moveable's own control handles (resize/rotate) claim the
      // gesture. Clicks on plain target boxes must fall through to Selecto's
      // normal select flow below, otherwise nothing can ever be selected.
      if (moveable.isMoveableElement(inputTarget)) {
        e.stop();
      }
    });

    selecto.on("selectEnd", (e) => {
      moveable.target = (e.selected[0] as HTMLElement) ?? null;

      // The same mousedown/touchstart that produced this selection may also
      // be the start of a drag. Hand the original input event off to
      // Moveable so the box moves immediately instead of requiring a
      // second, separate gesture.
      if (e.isDragStart) {
        e.inputEvent.preventDefault();
        moveable.forceUpdate(() => {
          moveable.dragStart(e.inputEvent);
        });
      }
    });

    moveable
      .on("drag", ({ target, transform }) => {
        target.style.transform = transform;
      })
      .on("resize", ({ target, width, height, drag }) => {
        target.style.width = `${width}px`;
        target.style.height = `${height}px`;
        target.style.transform = drag.transform;
      })
      .on("rotate", ({ target, drag }) => {
        target.style.transform = drag.transform;
      });

    return () => {
      moveable.destroy();
      selecto.destroy();
    };
  }, []);

  return (
    <div ref={stageRef} className={styles.stage}>
      {Array.from({ length: BOX_COUNT }, (_, i) => (
        <div
          key={i}
          className={styles.box}
          style={{ left: 40 + i * 150, top: 60 }}
          data-testid={`geometry-box-${i}`}
        >
          Box {i + 1}
        </div>
      ))}
    </div>
  );
}
