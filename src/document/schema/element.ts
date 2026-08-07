import { z } from "zod";
import { paintSchema, strokeSchema, typographySchema } from "./primitives";

export const elementKindSchema = z.enum([
  "group",
  "shape",
  "polygon",
  "text",
  "image",
  "path",
  "sprite",
]);
export type ElementKind = z.infer<typeof elementKindSchema>;

export const elementStyleSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
    rotationDeg: z.number().finite(),
    opacity: z.number().finite().min(0).max(1),
    fill: paintSchema.optional(),
    stroke: strokeSchema.optional(),
    borderRadiusPx: z.number().finite().min(0).optional(),
  })
  .strict();
export type ElementStyle = z.infer<typeof elementStyleSchema>;

export const elementStyleOverrideSchema = elementStyleSchema.partial();
export type ElementStyleOverride = z.infer<typeof elementStyleOverrideSchema>;

const pointSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();

// Restricts SVG path data to command letters, numbers, separators, and decimals -
// no arbitrary characters can reach the `d` attribute (see architecture.md section 13).
const svgPathSchema = z
  .string()
  .regex(/^[MLHVCSQTAZ0-9\s,.\-]+$/i, "must be a well-formed SVG path");

export const spriteFrameSchema = z
  .object({
    id: z.string().min(1),
    assetId: z.string().min(1),
    order: z.number().int().min(0),
  })
  .strict();
export type SpriteFrame = z.infer<typeof spriteFrameSchema>;

export const spritePlaybackSchema = z
  .object({
    startOffsetPx: z.number().finite().min(0),
    endOffsetPx: z.number().finite().min(0),
    behavior: z.literal("clamp"),
  })
  .strict();
export type SpritePlayback = z.infer<typeof spritePlaybackSchema>;

export const elementContentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("group") }).strict(),
  z.object({ kind: z.literal("shape"), shape: z.enum(["rectangle", "ellipse"]) }).strict(),
  z.object({ kind: z.literal("polygon"), points: z.array(pointSchema).min(3) }).strict(),
  z.object({ kind: z.literal("text"), text: z.string(), typography: typographySchema }).strict(),
  z
    .object({
      kind: z.literal("image"),
      assetId: z.string().min(1),
      fit: z.enum(["cover", "contain"]),
      alt: z.string(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("path"),
      points: z.array(z.tuple([z.number().finite(), z.number().finite()])),
      svgPath: svgPathSchema,
      closed: z.boolean(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("sprite"),
      frames: z.array(spriteFrameSchema).min(1).max(4),
      playback: spritePlaybackSchema,
    })
    .strict(),
]);
export type ElementContent = z.infer<typeof elementContentSchema>;

export const elementNodeSchema = z
  .object({
    id: z.string().min(1),
    pageId: z.string().min(1),
    parentId: z.string().min(1).nullable(),
    kind: elementKindSchema,
    name: z.string(),
    childIds: z.array(z.string().min(1)),
    hidden: z.boolean(),
    locked: z.boolean(),
    base: elementStyleSchema,
    viewportOverrides: z
      .object({ mobile: elementStyleOverrideSchema.optional() })
      .strict()
      .default({}),
    content: elementContentSchema,
  })
  .strict()
  .refine((element) => element.kind === element.content.kind, {
    message: "element.kind must match element.content.kind",
    path: ["content", "kind"],
  });
export type ElementNode = z.infer<typeof elementNodeSchema>;
