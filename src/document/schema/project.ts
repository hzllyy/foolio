import { z } from "zod";
import { elementNodeSchema } from "./element";
import { pageNodeSchema, projectSettingsSchema } from "./page";
import { elementAnimationSchema } from "./animation";

// Bump when ElementNode/PageNode/ProjectDocument shape changes; add a migration
// in src/document/migrations for every increment (see docs/data-model.md section 10).
export const CURRENT_SCHEMA_VERSION = 1;

export const projectDocumentSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    projectId: z.string().min(1),
    name: z.string(),
    settings: projectSettingsSchema,
    pageOrder: z.array(z.string().min(1)),
    pages: z.record(z.string(), pageNodeSchema),
    elements: z.record(z.string(), elementNodeSchema),
    // Keyed by `${elementId}:${viewport}`.
    animations: z.record(z.string(), elementAnimationSchema),
    assetIds: z.array(z.string().min(1)),
  })
  .strict();
export type ProjectDocument = z.infer<typeof projectDocumentSchema>;

export function elementAnimationKey(elementId: string, viewport: "desktop" | "mobile"): string {
  return `${elementId}:${viewport}`;
}
