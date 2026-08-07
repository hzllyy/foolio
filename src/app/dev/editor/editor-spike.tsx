"use client";

import { useMemo } from "react";
import { EditorShell } from "@/components/builder-shell";
import { fixtureProjectDocument } from "@/document/schema/fixtures";

/** Mounts the editor shell over a deep-cloned fixture project so repeated visits/reloads start fresh. */
export function EditorSpike() {
  const initialDocument = useMemo(() => structuredClone(fixtureProjectDocument), []);
  return <EditorShell initialDocument={initialDocument} initialPageId="page-1" />;
}
