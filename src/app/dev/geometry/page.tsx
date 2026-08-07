import { GeometrySpike } from "./geometry-spike";
import styles from "../dev.module.css";

export default function GeometrySpikePage() {
  return (
    <main className={styles.main}>
      <h1>Geometry spike</h1>
      <p>
        Click a box to select it, then drag, resize (corner/edge handles), or rotate (top handle).
      </p>
      <GeometrySpike />
    </main>
  );
}
