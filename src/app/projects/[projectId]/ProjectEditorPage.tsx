"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Patch } from "immer";
import { EditorShell } from "@/components/builder-shell";
import { createEmptyProject, type ProjectDocument } from "@/document/schema";
import { createGuestPersistence } from "@/persistence/guest";
import styles from "./ProjectEditorPage.module.css";

const SAVE_DEBOUNCE_MS = 800;

type SaveStatus = "idle" | "saving" | "saved" | "error";

const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Storage error — your changes may not be saved",
};

export type ProjectEditorPageProps = {
  projectId: string;
  /** True immediately after `/projects/new` redirects here; seeds a blank project instead of loading one. */
  isNew: boolean;
};

/** Loads (or seeds) a guest project's document and wires it to the Dexie persistence adapter. */
export function ProjectEditorPage({ projectId, isNew }: ProjectEditorPageProps) {
  const router = useRouter();
  const [persistence] = useState(() => createGuestPersistence());
  const [projectDocument, setProjectDocument] = useState<ProjectDocument | null>(() =>
    isNew ? createEmptyProject(projectId) : null,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const latestDocumentRef = useRef<ProjectDocument | null>(projectDocument);
  const pendingRef = useRef(false);
  const sequenceRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load (or seed) the project once on mount.
  useEffect(() => {
    let cancelled = false;

    if (isNew) {
      const seeded = latestDocumentRef.current!;
      persistence
        .saveSnapshot(projectId, seeded)
        .catch(() => {
          if (!cancelled) setSaveStatus("error");
        })
        .finally(() => {
          // Strip `?new=1` so a reload loads from storage instead of re-seeding a blank project.
          if (!cancelled) router.replace(`/projects/${projectId}`);
        });
      return () => {
        cancelled = true;
      };
    }

    persistence
      .loadProject(projectId)
      .then((loaded) => {
        if (cancelled) return;
        const resolved = loaded ?? createEmptyProject(projectId);
        latestDocumentRef.current = resolved;
        setProjectDocument(resolved);
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = createEmptyProject(projectId);
        latestDocumentRef.current = fallback;
        setProjectDocument(fallback);
        setSaveStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // Only re-run if the identity of the project being edited changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isNew]);

  // ADR-011: warn on tab exit only while a guest persistence transaction is pending. The handler
  // (not the listener registration) gates on `pendingRef` so this effect only needs to run once.
  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!pendingRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleDocumentPatches = useCallback(
    (patches: Patch[], updatedDocument: ProjectDocument) => {
      latestDocumentRef.current = updatedDocument;
      pendingRef.current = true;
      setSaveStatus("saving");

      const sequence = (sequenceRef.current += 1);
      void persistence.recordPendingOperation(projectId, sequence, patches).catch(() => {
        setSaveStatus("error");
      });

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        const toSave = latestDocumentRef.current;
        if (!toSave) return;
        persistence
          .saveSnapshot(projectId, toSave)
          .then(() => {
            pendingRef.current = false;
            setSaveStatus("saved");
          })
          .catch(() => {
            // Leave `pendingRef` set: the in-memory project stays usable but visibly unsaved.
            setSaveStatus("error");
          });
      }, SAVE_DEBOUNCE_MS);
    },
    [persistence, projectId],
  );

  if (!projectDocument) {
    return <main className={styles.loading}>Loading project…</main>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.statusBar}>
        <span className={styles.saveStatus} data-status={saveStatus}>
          {SAVE_STATUS_LABEL[saveStatus]}
        </span>
        <span className={styles.storageWarning}>
          Guest projects are stored only in this browser. Clearing site data or switching devices
          will lose this project.
        </span>
      </div>
      <EditorShell
        initialDocument={projectDocument}
        initialPageId={projectDocument.pageOrder[0]!}
        onDocumentPatches={handleDocumentPatches}
      />
    </div>
  );
}
