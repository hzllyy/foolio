const ACCEPTED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_ASSET_BYTES = 8 * 1024 * 1024;
const MAX_ASSETS_PER_PROJECT = 20;

export type UploadValidationResult = { ok: true } | { ok: false; reason: string };

/**
 * Enforces ADR-022's guest upload limits (PNG/JPEG/WebP, 8MB/image, 20 assets/project) client-side,
 * before a file is allowed to become an asset reference on the document.
 */
export function validateUpload(file: File, existingAssetCount: number): UploadValidationResult {
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return { ok: false, reason: "Only PNG, JPEG, and WebP images can be uploaded." };
  }
  if (file.size > MAX_ASSET_BYTES) {
    return { ok: false, reason: "Images must be 8MB or smaller." };
  }
  if (existingAssetCount >= MAX_ASSETS_PER_PROJECT) {
    return { ok: false, reason: "This project already has the maximum of 20 uploaded assets." };
  }
  return { ok: true };
}
