"use client";

import Image from "next/image";
import { Button } from "@/components/design-system";
import styles from "./Menubar.module.css";

/** Top application header: Foolio brand plus preview/deploy actions. */
export function Menubar() {
  return (
    <header className={styles.menubar}>
      <div className={styles.brandArea}>
        <Image
          src="/icons/foolioheader.svg"
          alt="Foolio"
          width={156}
          height={26}
          className={styles.brandIcon}
          priority
        />
      </div>
      <div className={styles.actions}>
        <Button
          kind="tertiary"
          leadingIcon={<span className={`${styles.buttonIcon} ${styles.previewIcon}`} aria-hidden="true" />}
        >
          preview
        </Button>
        <Button
          kind="primary"
          emphasis="solid"
          leadingIcon={<span className={`${styles.buttonIcon} ${styles.deployIcon}`} aria-hidden="true" />}
        >
          deploy
        </Button>
      </div>
    </header>
  );
}
