import { z } from "zod";
import { paintSchema } from "./primitives";
import type { Paint } from "./primitives";

export const viewportNameSchema = z.enum(["desktop", "mobile"]);
export type ViewportName = z.infer<typeof viewportNameSchema>;

export const pageViewportSchema = z
  .object({
    widthPx: z.number().finite().positive(),
    viewportHeightPx: z.number().finite().positive(),
    scrollLengthPx: z.number().finite().min(0),
    background: paintSchema,
  })
  .strict();
export type PageViewport = z.infer<typeof pageViewportSchema>;

export const pageNodeSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    slug: z.string().min(1),
    rootElementIds: z.array(z.string().min(1)),
    viewports: z
      .object({
        desktop: pageViewportSchema,
        mobile: pageViewportSchema,
      })
      .strict(),
  })
  .strict();
export type PageNode = z.infer<typeof pageNodeSchema>;

const DEFAULT_PAGE_BACKGROUND: Paint = { type: "solid", color: "#0f2164" };

/** Blank-page starting geometry for `page.create`/`page.duplicate` (no existing keyframes/scroll authored yet). */
export function createDefaultPageViewports(): PageNode["viewports"] {
  return {
    desktop: {
      widthPx: 1440,
      viewportHeightPx: 900,
      scrollLengthPx: 0,
      background: { ...DEFAULT_PAGE_BACKGROUND },
    },
    mobile: {
      widthPx: 390,
      viewportHeightPx: 844,
      scrollLengthPx: 0,
      background: { ...DEFAULT_PAGE_BACKGROUND },
    },
  };
}

export const reducedMotionPoseSchema = z.enum(["base", "first-keyframe"]);
export type ReducedMotionPose = z.infer<typeof reducedMotionPoseSchema>;

export const projectSettingsSchema = z
  .object({
    breakpointPx: z.number().finite().positive(),
    defaultViewport: viewportNameSchema,
    reducedMotionPose: reducedMotionPoseSchema,
  })
  .strict();
export type ProjectSettings = z.infer<typeof projectSettingsSchema>;

// Default breakpoint per docs/decisions.md ADR-005.
export const DEFAULT_BREAKPOINT_PX = 768;
