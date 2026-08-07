import { DesignSystemPreview } from "./design-system-preview";
import styles from "../dev.module.css";

export default function DesignSystemPreviewPage() {
  return (
    <main className={styles.main}>
      <h1>Design system preview</h1>
      <DesignSystemPreview />
    </main>
  );
}
