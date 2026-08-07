// Dexie-backed IndexedDB adapter for guest documents, asset blobs, and account migration.
import Dexie, { type EntityTable } from "dexie";
import { applyPatches } from "immer";
import type { Patch } from "immer";
import type { ProjectDocument } from "@/document/schema";
import { migrate } from "@/document/migrations";

/** See docs/data-model.md section 7. A successful migration records the remote project/revision before local cleanup. */
export type GuestMigrationState = "local" | "migrating" | "migrated" | "migration_failed";

export type GuestProjectRecord = {
  id: string;
  updatedAt: number;
  migrationState: GuestMigrationState;
  document: ProjectDocument;
  remoteProjectId?: string;
  remoteRevision?: number;
};

export type GuestAssetStatus = "pending" | "stored";

export type GuestAssetRecord = {
  id: string;
  projectId: string;
  contentHash: string;
  status: GuestAssetStatus;
  mimeType: string;
  blob: Blob;
};

/** A lightweight patch-set recorded between compacted document snapshots, replayed on load for crash recovery. */
export type PendingOperationRecord = {
  id: string;
  projectId: string;
  sequence: number;
  createdAt: number;
  patches: Patch[];
};

export type GuestDatabase = Dexie & {
  guest_projects: EntityTable<GuestProjectRecord, "id">;
  guest_assets: EntityTable<GuestAssetRecord, "id">;
  pending_operations: EntityTable<PendingOperationRecord, "id">;
};

export const GUEST_DB_NAME = "foolio-guest";

/** Opens (or returns the already-open) Dexie database with the guest schema from docs/data-model.md section 7. */
export function openGuestDatabase(dbName: string = GUEST_DB_NAME): GuestDatabase {
  const db = new Dexie(dbName) as GuestDatabase;
  db.version(1).stores({
    guest_projects: "&id, updatedAt, migrationState",
    guest_assets: "&id, projectId, contentHash, status",
    pending_operations: "&id, projectId, sequence, createdAt",
  });
  return db;
}

export type NewGuestAsset = {
  id: string;
  projectId: string;
  contentHash: string;
  mimeType: string;
  blob: Blob;
};

export type GuestPersistence = {
  /** Loads the last compacted snapshot with any pending operations replayed on top (crash recovery). Undefined if never saved. */
  loadProject(projectId: string): Promise<ProjectDocument | undefined>;
  /** Writes a full snapshot and clears the project's pending operations ("compaction"). */
  saveSnapshot(
    projectId: string,
    document: ProjectDocument,
    migrationState?: GuestMigrationState,
  ): Promise<void>;
  /** Appends one pending-operation record; call once per dispatched (already gesture-coalesced) command. */
  recordPendingOperation(projectId: string, sequence: number, patches: Patch[]): Promise<void>;
  /** Deletes a project's snapshot, assets, and pending operations. */
  deleteProject(projectId: string): Promise<void>;
  putAsset(asset: NewGuestAsset): Promise<void>;
  getAssetsForProject(projectId: string): Promise<GuestAssetRecord[]>;
  /**
   * True while at least one pending operation has been recorded since the last successful
   * compaction (this persistence instance assumes a single active project per browser tab, per
   * the guest editor's single-document session model).
   */
  hasPendingWrite(): boolean;
  close(): void;
};

/**
 * Creates the guest persistence adapter (Dexie-backed IndexedDB). Accepts either a database name
 * (the common case) or an already-open `GuestDatabase`, which lets tests inject a db instance with
 * mocked table methods to simulate quota/write failures.
 */
export function createGuestPersistence(
  dbOrName: GuestDatabase | string = GUEST_DB_NAME,
): GuestPersistence {
  const db = typeof dbOrName === "string" ? openGuestDatabase(dbOrName) : dbOrName;
  let pendingWriteCount = 0;

  return {
    async loadProject(projectId) {
      const record = await db.guest_projects.get(projectId);
      if (!record) return undefined;

      const pending = await db.pending_operations
        .where("projectId")
        .equals(projectId)
        .sortBy("sequence");

      let document = migrate(record.document as unknown as Record<string, unknown>);
      for (const operation of pending) {
        document = applyPatches(document, operation.patches);
      }
      return document;
    },

    async saveSnapshot(projectId, document, migrationState = "local") {
      await db.transaction("rw", db.guest_projects, db.pending_operations, async () => {
        await db.guest_projects.put({
          id: projectId,
          updatedAt: Date.now(),
          migrationState,
          document,
        });
        await db.pending_operations.where("projectId").equals(projectId).delete();
      });
      pendingWriteCount = 0;
    },

    async recordPendingOperation(projectId, sequence, patches) {
      pendingWriteCount += 1;
      await db.pending_operations.put({
        id: `${projectId}:${sequence}`,
        projectId,
        sequence,
        createdAt: Date.now(),
        patches,
      });
    },

    async deleteProject(projectId) {
      await db.transaction(
        "rw",
        db.guest_projects,
        db.guest_assets,
        db.pending_operations,
        async () => {
          await db.guest_projects.delete(projectId);
          await db.guest_assets.where("projectId").equals(projectId).delete();
          await db.pending_operations.where("projectId").equals(projectId).delete();
        },
      );
    },

    async putAsset(asset) {
      await db.guest_assets.put({ ...asset, status: "stored" });
    },

    async getAssetsForProject(projectId) {
      return db.guest_assets.where("projectId").equals(projectId).toArray();
    },

    hasPendingWrite() {
      return pendingWriteCount > 0;
    },

    close() {
      db.close();
    },
  };
}
