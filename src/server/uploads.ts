import "server-only";
import { z } from "zod";
import { buildDocumentKey, presignUpload } from "@/lib/s3";
// MIME 許可リスト・サイズ上限はクライアント UI と共有する定数モジュールに集約。
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/upload-constraints";

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
