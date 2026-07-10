import "server-only";
import { z } from "zod";
import { buildDocumentKey, presignUpload } from "@/lib/s3";

// 受け入れる MIME 形式(書類=PDF + 写真)。増やすときは lib/s3.ts の MIME_EXT も合わせる。
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
] as const;

// 1ファイルの上限(25MB)。事故防止のガードレール。PDF/写真は通常これに十分収まる。
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const presignSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mime_type: z.enum(ALLOWED_MIME_TYPES),
  // クライアントが宣言するバイト数。署名に ContentLength として束縛するため、
  // 実際の PUT はこのサイズと一致しないと S3 が拒否する(偽装で上限を超えられない)。
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES, "ファイルサイズが大きすぎます"),
});

export type PresignInput = z.infer<typeof presignSchema>;

/**
 * アップロード用の署名付き PUT URL と、登録に使う s3_key を返す。
 * 署名はサーバー側のみ・実体は API を通さず client↔S3 直結(設計書 §3)。
 */
export async function createUploadUrl(input: PresignInput) {
  const s3Key = buildDocumentKey(input.filename, input.mime_type);
  const uploadUrl = await presignUpload(s3Key, input.mime_type, input.size);
  return { upload_url: uploadUrl, s3_key: s3Key };
}
