import "server-only";
import { z } from "zod";
import { buildDocumentKey, presignUpload } from "@/lib/s3";
// MIME 許可リスト・サイズ上限はクライアント UI と共有する定数モジュールに集約。
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_COUNT,
  MAX_UPLOAD_TOTAL_BYTES,
} from "@/lib/upload-constraints";

const presignFileSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mime_type: z.enum(ALLOWED_MIME_TYPES),
  // クライアントが宣言するバイト数。署名に ContentLength として束縛するため、
  // 実際の PUT はこのサイズと一致しないと S3 が拒否する(偽装で上限を超えられない)。
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES, "ファイルサイズが大きすぎます"),
});

// 複数ファイルをまとめて presign する。件数・合計サイズのガードレールもここで検証。
export const presignSchema = z
  .object({
    files: z.array(presignFileSchema).min(1, "ファイルを指定してください").max(MAX_UPLOAD_COUNT),
  })
  .refine((v) => v.files.reduce((sum, f) => sum + f.size, 0) <= MAX_UPLOAD_TOTAL_BYTES, {
    message: "合計サイズが大きすぎます",
    path: ["files"],
  });

export type PresignInput = z.infer<typeof presignSchema>;

/**
 * 各ファイルのアップロード用の署名付き PUT URL と、登録に使う s3_key を返す。
 * 順序は入力の files と 1:1 で対応する。
 * 署名はサーバー側のみ・実体は API を通さず client↔S3 直結(設計書 §3)。
 */
export async function createUploadUrls(input: PresignInput) {
  const results = await Promise.all(
    input.files.map(async (f) => {
      const s3Key = buildDocumentKey(f.filename, f.mime_type);
      const uploadUrl = await presignUpload(s3Key, f.mime_type, f.size);
      return { upload_url: uploadUrl, s3_key: s3Key };
    }),
  );
  return { results };
}
