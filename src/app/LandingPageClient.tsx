"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

const DEFAULT_ICON_SRC = "/images/foolio-icon.PNG";
const LEFT_ICON_SRC = "/images/foolio-icon-left.PNG";
const RIGHT_ICON_SRC = "/images/foolio-icon-right.PNG";

const THRESHOLD_PX = 120;
const MAX_PUSH_PX = 8;
const LERP = 0.18;

type LetterState = {
  cx: number;
  cy: number;
  curX: number;
  curY: number;
};

export function LandingPageClient() {
  const [iconSrc, setIconSrc] = useState(DEFAULT_ICON_SRC);

  const letters = useMemo(
    () => [
      { key: "f", char: "f", className: styles.f },
      { key: "o", char: "o", className: styles.o },
      { key: "o2", char: "o", className: styles.o2 },
      { key: "l", char: "l", className: styles.l },
      { key: "i", char: "i", className: styles.i },
      { key: "o3", char: "o", className: styles.o3 },
    ],
    [],
  );

  const letterRefs = useRef<Array<HTMLHeadingElement | null>>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const letterStateRef = useRef<LetterState[]>([]);

  useEffect(() => {
    letterStateRef.current = letterRefs.current.map(() => ({
      cx: 0,
      cy: 0,
      curX: 0,
      curY: 0,
    }));

    const updateCenters = () => {
      for (let i = 0; i < letterRefs.current.length; i += 1) {
        const el = letterRefs.current[i];
        const state = letterStateRef.current[i];
        if (!el || !state) continue;
        const rect = el.getBoundingClientRect();
        state.cx = rect.left + rect.width / 2;
        state.cy = rect.top + rect.height / 2;
      }
    };

    updateCenters();

    const onMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
    };

    let rafId = 0;
    const animate = () => {
      for (let i = 0; i < letterRefs.current.length; i += 1) {
        const el = letterRefs.current[i];
        const state = letterStateRef.current[i];
        if (!el || !state) continue;

        const dx = state.cx - mouseRef.current.x;
        const dy = state.cy - mouseRef.current.y;
        const dist = Math.hypot(dx, dy);
        let tx = 0;
        let ty = 0;

        if (dist < THRESHOLD_PX) {
          const strength = (1 - dist / THRESHOLD_PX) * MAX_PUSH_PX;
          if (dist > 0.5) {
            tx = (dx / dist) * strength;
            ty = (dy / dist) * strength;
          } else {
            tx = strength;
          }
        }

        state.curX += (tx - state.curX) * LERP;
        state.curY += (ty - state.curY) * LERP;

        if (Math.abs(state.curX) < 0.01) state.curX = 0;
        if (Math.abs(state.curY) < 0.01) state.curY = 0;

        el.style.setProperty("--px", `${state.curX}px`);
        el.style.setProperty("--py", `${state.curY}px`);
      }

      rafId = window.requestAnimationFrame(animate);
    };

    window.addEventListener("resize", updateCenters);
    window.addEventListener("mousemove", onMouseMove);
    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", updateCenters);
      window.removeEventListener("mousemove", onMouseMove);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Matches legacy icon asset usage. */}
        <img src="/icons/language.svg" alt="language switch" className={styles.globeIcon} />

        <div className={styles.foolioText}>
          {letters.map((letter, index) => (
            <h1
              key={letter.key}
              ref={(el) => {
                letterRefs.current[index] = el;
              }}
              className={`${styles.letter} ${letter.className}`}
            >
              {letter.char}
            </h1>
          ))}
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element -- Mirrors legacy static landing behavior. */}
        <img src={iconSrc} alt="foolio-icon" className={styles.icon} />

        <div className={styles.buttonRow}>
          <a
            href="/login"
            className={styles.legacyButton}
            onMouseOver={() => setIconSrc(LEFT_ICON_SRC)}
            onMouseOut={() => setIconSrc(DEFAULT_ICON_SRC)}
          >
            login
          </a>
          <Link
            href="/projects/new"
            className={styles.legacyButton}
            onMouseOver={() => setIconSrc(RIGHT_ICON_SRC)}
            onMouseOut={() => setIconSrc(DEFAULT_ICON_SRC)}
          >
            get started
          </Link>
        </div>
      </div>
    </main>
  );
}
