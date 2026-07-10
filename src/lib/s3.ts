import "server-only";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import { env } from "@/lib/env";

// 署名付き URL の有効期限(秒)。設計書 §3: ファイル到達は短命 URL のみ。
export const UPLOAD_URL_TTL_SECONDS = 300; // 5分
export const DOWNLOAD_URL_TTL_SECONDS = 300; // 5分

// 認証は Vercel OIDC → IAM ロール assume(AssumeRoleWithWebIdentity)。
// 静的なアクセスキーは持たず、既定 audience(https://vercel.com/<team>)のトークンを使う。
// ローカルは vercel env pull で得た VERCEL_OIDC_TOKEN を provider が自動利用する。
const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: awsCredentialsProvider({ roleArn: env.AWS_ROLE_ARN }),
});

// MIME → 拡張子の最小マッピング(filename から取れない場合のフォールバック)。
const MIME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/webp": "webp",
};

/** filename か mime_type から拡張子(ドット無し・小文字)を推定する。不明なら null。 */
function guessExtension(filename: string, mimeType: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot >= 0 && dot < filename.length - 1) {
    return filename.slice(dot + 1).toLowerCase();
  }
  return MIME_EXT[mimeType] ?? null;
}

/**
 * 書類の S3 キーを生成する。設計書どおりフラット(`documents/{uuid}.{ext}`)。
 * フォルダ階層はキーに埋め込まない。元ファイル名は保持しない。
 */
export function buildDocumentKey(filename: string, mimeType: string): string {
  const ext = guessExtension(filename, mimeType);
  const id = crypto.randomUUID();
  return ext ? `documents/${id}.${ext}` : `documents/${id}`;
}

/**
 * アップロード用の署名付き PUT URL を発行する。
 * Content-Type / Content-Length を署名に含めるため、クライアントは同じ mime_type・サイズで
 * PUT する必要がある(MIME 偽装・サイズ超過を S3 側で拒否できる)。
 */
export function presignUpload(key: string, mimeType: string, size: number): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: mimeType,
    ContentLength: size,
  });
  return getSignedUrl(s3, cmd, { expiresIn: UPLOAD_URL_TTL_SECONDS });
}

/** ダウンロード用の短命な署名付き GET URL を発行する。 */
export function presignDownload(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
}
