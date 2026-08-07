import Link from "next/link";
import styles from "./dev.module.css";

// Internal-only index for technical spikes and previews; not linked from product navigation.
export default function DevIndexPage() {
  return (
    <main className={styles.main}>
      <h1>Dev spikes and previews</h1>
      <ul className={styles.list}>
        <li>
          <Link href="/dev/geometry">Geometry: select/drag/resize/rotate (Moveable + Selecto)</Link>
        </li>
        <li>
          <Link href="/dev/perf">Render performance: 200 elements</Link>
        </li>
        <li>
          <Link href="/dev/guest-storage">Guest storage: project + 4 images in IndexedDB</Link>
        </li>
        <li>
          <Link href="/dev/design-system">Design system: Figma-derived tokens and primitives</Link>
        </li>
        <li>
          <Link href="/dev/renderer">Renderer: fixture portfolio in desktop/mobile (Phase 1)</Link>
        </li>
        <li>
          <Link href="/dev/editor">
            Editor: builder shell over an in-memory fixture project (Phase 2)
          </Link>
        </li>
      </ul>
    </main>
  );
}
