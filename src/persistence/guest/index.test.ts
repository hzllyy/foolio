import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyCommand } from "@/editor/commands/apply";
import { fixtureProjectDocument } from "@/document/schema/fixtures";
import { createGuestPersistence, openGuestDatabase, type GuestDatabase } from "@/persistence/guest";

let dbCounter = 0;
function freshDbName(): string {
  dbCounter += 1;
  return `foolio-guest-test-${dbCounter}`;
}

describe("guest persistence", () => {
  it("round-trips a saved snapshot", async () => {
    const persistence = createGuestPersistence(freshDbName());
    const projectId = "project-1";

    await persistence.saveSnapshot(projectId, fixtureProjectDocument);
    const loaded = await persistence.loadProject(projectId);

    expect(loaded).toEqual(fixtureProjectDocument);
    persistence.close();
  });

  it("returns undefined for a project that was never saved", async () => {
    const persistence = createGuestPersistence(freshDbName());
    expect(await persistence.loadProject("nope")).toBeUndefined();
    persistence.close();
  });

  it("replays pending operations recorded since the last snapshot (crash recovery)", async () => {
    const persistence = createGuestPersistence(freshDbName());
    const projectId = "project-1";

    await persistence.saveSnapshot(projectId, fixtureProjectDocument);

    const { patches } = applyCommand(fixtureProjectDocument, {
      type: "element.patch",
      payload: { elementId: "hero-shape", base: { x: 500 } },
    });
    await persistence.recordPendingOperation(projectId, 1, patches);

    // Simulate a crash: no saveSnapshot/compaction call after recording the pending operation.
    const loaded = await persistence.loadProject(projectId);
    expect(loaded!.elements["hero-shape"]!.base.x).toBe(500);

    persistence.close();
  });

  it("hasPendingWrite reflects recorded-but-not-compacted operations", async () => {
    const persistence = createGuestPersistence(freshDbName());
    const projectId = "project-1";

    expect(persistence.hasPendingWrite()).toBe(false);

    const { patches } = applyCommand(fixtureProjectDocument, {
      type: "element.patch",
      payload: { elementId: "hero-shape", base: { x: 500 } },
    });
    await persistence.recordPendingOperation(projectId, 1, patches);
    expect(persistence.hasPendingWrite()).toBe(true);

    await persistence.saveSnapshot(projectId, fixtureProjectDocument);
    expect(persistence.hasPendingWrite()).toBe(false);

    persistence.close();
  });

  it("stores and retrieves assets for a project", async () => {
    const persistence = createGuestPersistence(freshDbName());
    const projectId = "project-1";
    const blob = new Blob(["hello"], { type: "text/plain" });

    await persistence.putAsset({
      id: "asset-1",
      projectId,
      contentHash: "hash-1",
      mimeType: "text/plain",
      blob,
    });

    const assets = await persistence.getAssetsForProject(projectId);
    expect(assets).toHaveLength(1);
    expect(assets[0]!.id).toBe("asset-1");
    expect(assets[0]!.status).toBe("stored");

    persistence.close();
  });

  it("deleteProject removes the snapshot, assets, and pending operations", async () => {
    const persistence = createGuestPersistence(freshDbName());
    const projectId = "project-1";

    await persistence.saveSnapshot(projectId, fixtureProjectDocument);
    await persistence.putAsset({
      id: "asset-1",
      projectId,
      contentHash: "hash-1",
      mimeType: "text/plain",
      blob: new Blob(["hello"]),
    });
    const { patches } = applyCommand(fixtureProjectDocument, {
      type: "element.patch",
      payload: { elementId: "hero-shape", base: { x: 500 } },
    });
    await persistence.recordPendingOperation(projectId, 1, patches);

    await persistence.deleteProject(projectId);

    expect(await persistence.loadProject(projectId)).toBeUndefined();
    expect(await persistence.getAssetsForProject(projectId)).toEqual([]);

    persistence.close();
  });

  describe("write failures", () => {
    let db: GuestDatabase;

    beforeEach(() => {
      db = openGuestDatabase(freshDbName());
    });

    it("saveSnapshot rejects and leaves hasPendingWrite true when the Dexie transaction fails", async () => {
      const persistence = createGuestPersistence(db);
      const projectId = "project-1";

      const { patches } = applyCommand(fixtureProjectDocument, {
        type: "element.patch",
        payload: { elementId: "hero-shape", base: { x: 500 } },
      });
      await persistence.recordPendingOperation(projectId, 1, patches);
      expect(persistence.hasPendingWrite()).toBe(true);

      vi.spyOn(db, "transaction").mockRejectedValueOnce(
        new Error("QuotaExceededError: storage quota exceeded"),
      );

      await expect(persistence.saveSnapshot(projectId, fixtureProjectDocument)).rejects.toThrow(
        "QuotaExceededError",
      );
      // The failed compaction must not silently clear the pending-write flag: the in-memory
      // project is still usable but visibly unsaved.
      expect(persistence.hasPendingWrite()).toBe(true);

      persistence.close();
    });
  });
});
