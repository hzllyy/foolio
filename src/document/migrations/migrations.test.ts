import { describe, expect, it } from "vitest";
import {
  migrate,
  runMigrations,
  UnsupportedSchemaVersionError,
  type Migration,
} from "@/document/migrations";
import { fixtureProjectDocument } from "@/document/schema/fixtures";

describe("runMigrations", () => {
  it("returns the document unchanged when already at the target version", () => {
    const doc = { schemaVersion: 2, value: "x" };
    expect(runMigrations(doc, {}, 2)).toEqual(doc);
  });

  it("applies migrations in sequence up to the target version", () => {
    const registry: Record<number, Migration> = {
      1: (doc) => ({ ...doc, schemaVersion: 2, addedInV2: true }),
      2: (doc) => ({ ...doc, schemaVersion: 3, addedInV3: true }),
    };
    const result = runMigrations({ schemaVersion: 1 }, registry, 3);
    expect(result).toEqual({ schemaVersion: 3, addedInV2: true, addedInV3: true });
  });

  it("throws when a required migration step is missing from the registry", () => {
    expect(() => runMigrations({ schemaVersion: 1 }, {}, 2)).toThrow(UnsupportedSchemaVersionError);
  });

  it("throws when the document's version is newer than the target", () => {
    expect(() => runMigrations({ schemaVersion: 5 }, {}, 2)).toThrow(UnsupportedSchemaVersionError);
  });

  it("throws when the document has no valid schemaVersion", () => {
    expect(() => runMigrations({}, {}, 2)).toThrow(UnsupportedSchemaVersionError);
  });
});

describe("migrate", () => {
  it("validates and returns a current-version document unchanged", () => {
    const result = migrate(fixtureProjectDocument as unknown as Record<string, unknown>);
    expect(result).toEqual(fixtureProjectDocument);
  });

  it("rejects a document that fails schema validation even at the current version", () => {
    const invalid = { ...fixtureProjectDocument, elements: "not-a-record" };
    expect(() => migrate(invalid as unknown as Record<string, unknown>)).toThrow();
  });
});
