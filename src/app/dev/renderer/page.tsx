import { RendererPreview } from "./renderer-preview";
import styles from "../dev.module.css";

export default function RendererPreviewPage() {
  return (
    <main className={styles.main}>
      <h1>Renderer preview</h1>
      <RendererPreview />
    </main>
  );
}
