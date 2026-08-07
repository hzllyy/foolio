import {
  CURRENT_SCHEMA_VERSION,
  projectDocumentSchema,
  type ProjectDocument,
} from "@/document/schema";

/** A deterministic transform from one schemaVersion to the next (see docs/data-model.md section 10). */
export type Migration = (document: Record<string, unknown>) => Record<string, unknown>;

/** Keyed by the version a migration upgrades *from*. Empty until schemaVersion 2 is introduced. */
export const MIGRATIONS: Record<number, Migration> = {};

export class UnsupportedSchemaVersionError extends Error {
  constructor(public readonly schemaVersion: unknown) {
    super(`Unsupported project document schemaVersion: ${String(schemaVersion)}`);
    this.name = "UnsupportedSchemaVersionError";
  }
}

/**
 * Runs every migration needed to bring a raw document up to `targetVersion`,
 * using the supplied registry. Exported separately from `migrate` so tests can
 * exercise the stepping logic against synthetic registries.
 */
export function runMigrations(
  document: Record<string, unknown>,
  registry: Record<number, Migration>,
  targetVersion: number,
): Record<string, unknown> {
  let current = document;
  let version = Number(current.schemaVersion);
  if (!Number.isInteger(version) || version < 1) {
    throw new UnsupportedSchemaVersionError(current.schemaVersion);
  }

  while (version < targetVersion) {
    const migration = registry[version];
    if (!migration) {
      throw new UnsupportedSchemaVersionError(current.schemaVersion);
    }
    current = migration(current);
    version = Number(current.schemaVersion);
  }

  if (version > targetVersion) {
    throw new UnsupportedSchemaVersionError(current.schemaVersion);
  }

  return current;
}

/** Migrates a raw (untrusted) document to the current schema version and validates it. */
export function migrate(document: Record<string, unknown>): ProjectDocument {
  const migrated = runMigrations(document, MIGRATIONS, CURRENT_SCHEMA_VERSION);
  return projectDocumentSchema.parse(migrated);
}
