import { PerfSpike } from "./perf-spike";
import styles from "../dev.module.css";

export default function PerfSpikePage() {
  return (
    <main className={styles.main}>
      <h1>Render performance spike</h1>
      <p>Proves 200 absolutely positioned elements mount quickly and scroll smoothly.</p>
      <PerfSpike />
    </main>
  );
}
