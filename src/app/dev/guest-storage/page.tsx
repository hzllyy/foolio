import { GuestStorageSpike } from "./guest-storage-spike";
import styles from "../dev.module.css";

export default function GuestStorageSpikePage() {
  return (
    <main className={styles.main}>
      <h1>Guest storage spike</h1>
      <p>Proves a project record plus four image blobs can round-trip through IndexedDB (Dexie).</p>
      <GuestStorageSpike />
    </main>
  );
}
