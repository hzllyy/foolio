"use client";

import { useState } from "react";
import { Button, SegmentedControl, TextField, type EditorMode } from "@/components/design-system";
import previewStyles from "./design-system-preview.module.css";

// Visual check for the Figma-derived tokens/primitives (node 107:4). See docs/implementation-plan.md Phase 0.
export function DesignSystemPreview() {
  const [mode, setMode] = useState<EditorMode>("edit");

  return (
    <>
      <section className={previewStyles.row}>
        <Button kind="primary" emphasis="outline">
          login
        </Button>
        <Button kind="primary" emphasis="solid">
          login
        </Button>
      </section>

      {/* Tertiary buttons use honey tones meant for a dark surface, per the Figma reference. */}
      <section className={`${previewStyles.row} ${previewStyles.darkSurface}`}>
        <Button kind="tertiary" emphasis="solid">
          submit
        </Button>
        <Button kind="tertiary" emphasis="outline">
          submit
        </Button>
      </section>

      <section className={previewStyles.row}>
        <TextField label="Email" placeholder="email" />
      </section>

      <section className={previewStyles.row}>
        <SegmentedControl value={mode} onChange={setMode} />
        <p>Current mode: {mode}</p>
      </section>
    </>
  );
}
