// アップロード制約。サーバー検証(server/uploads.ts)とクライアント UI で共有するため、
// server-only にはしない(秘密情報を含まない定数のみ)。
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// 1ファイルの上限(25MB)。事故防止のガードレール。
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// <input type="file" accept> 用。
export const UPLOAD_ACCEPT = ALLOWED_MIME_TYPES.join(",");

export function isAllowedMimeType(mime: string): mime is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}
