import { z } from "zod";

// Hex-only color values keep fill/stroke/typography colors safe to interpolate
// into inline styles without allowing arbitrary CSS injection (see architecture.md section 13).
const hexColorSchema = z
  .string()
  .regex(
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
    "must be a #rgb, #rrggbb, or #rrggbbaa hex color",
  );

export const paintSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }).strict(),
  z.object({ type: z.literal("solid"), color: hexColorSchema }).strict(),
]);
export type Paint = z.infer<typeof paintSchema>;

export const strokeSchema = z
  .object({
    color: hexColorSchema,
    widthPx: z.number().finite().min(0),
  })
  .strict();
export type Stroke = z.infer<typeof strokeSchema>;

export const textAlignSchema = z.enum(["left", "center", "right"]);
export type TextAlign = z.infer<typeof textAlignSchema>;

export const typographySchema = z
  .object({
    fontFamily: z.string().min(1),
    fontSizePx: z.number().finite().min(0),
    fontWeight: z.number().finite().min(1).max(1000),
    lineHeightPx: z.number().finite().min(0),
    letterSpacingPx: z.number().finite(),
    color: hexColorSchema,
    textAlign: textAlignSchema,
  })
  .strict();
export type Typography = z.infer<typeof typographySchema>;
