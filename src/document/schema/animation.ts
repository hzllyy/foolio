import { z } from "zod";
import { viewportNameSchema } from "./page";

export const animatableProperties = [
  "x",
  "y",
  "width",
  "height",
  "rotationDeg",
  "opacity",
] as const;
export type AnimatableProperty = (typeof animatableProperties)[number];

export const easingSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("linear") }),
  z.object({ type: z.enum(["ease-in", "ease-out", "ease-in-out"]) }),
  z.object({
    type: z.literal("cubic-bezier"),
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
  }),
]);
export type Easing = z.infer<typeof easingSchema>;

export const keyframeSchema = z
  .object({
    id: z.string().min(1),
    offsetPx: z.number().finite().min(0),
    value: z.number().finite(),
    easing: easingSchema,
  })
  .strict();
export type Keyframe = z.infer<typeof keyframeSchema>;

export const animationTrackSchema = z
  .object({
    property: z.enum(animatableProperties),
    keyframes: z.array(keyframeSchema),
  })
  .strict()
  .refine(
    (track) => {
      const seen = new Set<number>();
      for (const keyframe of track.keyframes) {
        if (seen.has(keyframe.offsetPx)) return false;
        seen.add(keyframe.offsetPx);
      }
      return true;
    },
    { message: "keyframes must have unique offsetPx values", path: ["keyframes"] },
  );
export type AnimationTrack = z.infer<typeof animationTrackSchema>;

export const elementAnimationSchema = z
  .object({
    elementId: z.string().min(1),
    viewport: viewportNameSchema,
    tracks: z
      .object({
        x: animationTrackSchema.optional(),
        y: animationTrackSchema.optional(),
        width: animationTrackSchema.optional(),
        height: animationTrackSchema.optional(),
        rotationDeg: animationTrackSchema.optional(),
        opacity: animationTrackSchema.optional(),
      })
      .strict(),
  })
  .strict();
export type ElementAnimation = z.infer<typeof elementAnimationSchema>;
