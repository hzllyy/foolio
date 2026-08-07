"use client";

import { useEffect, useState } from "react";
import Dexie, { type EntityTable } from "dexie";
import styles from "./guest-storage-spike.module.css";

type SpikeProject = {
  id: string;
  name: string;
  updatedAt: number;
  assetIds: string[];
};

type SpikeAsset = {
  id: string;
  projectId: string;
  mimeType: string;
  blob: Blob;
};

const db = new Dexie("foolio-phase0-guest-storage-spike") as Dexie & {
  projects: EntityTable<SpikeProject, "id">;
  assets: EntityTable<SpikeAsset, "id">;
};

db.version(1).stores({
  projects: "&id, updatedAt",
  assets: "&id, projectId",
});

const FRAME_COLORS = ["#0f2164", "#566498", "#9fa9cb", "#ebdebd"];

function drawPlaceholderImage(label: string, color: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("2D canvas context unavailable"));
  }
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fbf0d3";
  ctx.font = "20px sans-serif";
  ctx.fillText(label, 16, 88);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob failed"))),
      "image/png",
    );
  });
}

type LoadedAsset = { id: string; url: string };

/**
 * Phase 0 risk prototype proving Dexie/IndexedDB can persist a project record plus
 * four representative image blobs and read them back. See docs/implementation-plan.md Phase 0.
 */
export function GuestStorageSpike() {
  const [status, setStatus] = useState<"idle" | "writing" | "reading" | "done" | "cleared">("idle");
  const [writeMs, setWriteMs] = useState<number | null>(null);
  const [readMs, setReadMs] = useState<number | null>(null);
  const [project, setProject] = useState<SpikeProject | null>(null);
  const [assets, setAssets] = useState<LoadedAsset[]>([]);

  async function runSpike() {
    setStatus("writing");
    const projectId = crypto.randomUUID();
    const assetIds = FRAME_COLORS.map(() => crypto.randomUUID());

    const writeStart = performance.now();
    const blobs = await Promise.all(
      FRAME_COLORS.map((color, i) => drawPlaceholderImage(`Image ${i + 1}`, color)),
    );
    await db.transaction("rw", db.projects, db.assets, async () => {
      await db.projects.put({
        id: projectId,
        name: "Phase 0 spike project",
        updatedAt: Date.now(),
        assetIds,
      });
      await db.assets.bulkPut(
        blobs.map((blob, i) => ({
          id: assetIds[i] as string,
          projectId,
          mimeType: "image/png",
          blob,
        })),
      );
    });
    setWriteMs(performance.now() - writeStart);

    setStatus("reading");
    const readStart = performance.now();
    const storedProject = await db.projects.get(projectId);
    const storedAssets = await db.assets.where("projectId").equals(projectId).toArray();
    setReadMs(performance.now() - readStart);

    setProject(storedProject ?? null);
    setAssets(storedAssets.map((a) => ({ id: a.id, url: URL.createObjectURL(a.blob) })));
    setStatus("done");
  }

  async function clearSpike() {
    await db.assets.clear();
    await db.projects.clear();
    assets.forEach((a) => URL.revokeObjectURL(a.url));
    setProject(null);
    setAssets([]);
    setWriteMs(null);
    setReadMs(null);
    setStatus("cleared");
  }

  useEffect(() => {
    return () => {
      assets.forEach((a) => URL.revokeObjectURL(a.url));
    };
    // Revoke only on unmount, not on every `assets` change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <p>
        <button type="button" onClick={runSpike}>
          Write project + 4 images to IndexedDB
        </button>{" "}
        <button type="button" onClick={clearSpike}>
          Clear
        </button>
      </p>
      <p>Status: {status}</p>
      {writeMs !== null && <p>Write: {writeMs.toFixed(2)}ms</p>}
      {readMs !== null && <p>Read: {readMs.toFixed(2)}ms</p>}
      {project && (
        <p>
          Loaded project &quot;{project.name}&quot; with {project.assetIds.length} asset refs.
        </p>
      )}
      <div className={styles.thumbs}>
        {assets.map((a) => (
          // eslint-disable-next-line @next/next/no-img-element -- object URLs cannot use next/image
          <img key={a.id} src={a.url} alt="" className={styles.thumb} />
        ))}
      </div>
    </div>
  );
}
