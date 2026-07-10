import "server-only";
import { z } from "zod";
import { parseAllowedEmails } from "./allowlist";

// アプリの環境変数はここで一元的に検証する(直接 process.env を参照しない)。
// 新しい変数を足すときは .env.example も更新する。
const schema = z.object({
  AUTH_SECRET: z.string().min(1),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  AUTH_ALLOWED_EMAILS: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  // DB ドライバの切替: neon=Neon(HTTP, 本番/検証) / pg=素の PostgreSQL(TCP, ローカル docker 等)
  DB_DRIVER: z.enum(["neon", "pg"]).default("neon"),
  // Amazon S3(書類の保存先)。認証は Vercel OIDC → IAM ロール assume で行うため
  // アクセスキーは持たない(AWS_ROLE_ARN のみ)。詳細は infra/cfn-tottoku-*.yaml。
  // AWS_REGION は Vercel が実行リージョンで動的に上書きするため必ず明示設定する。
  AWS_REGION: z.string().min(1),
  AWS_ROLE_ARN: z.string().min(1),
  S3_BUCKET: z.string().min(1),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(`環境変数が不正です: ${missing}`);
}

export const env = {
  ...parsed.data,
  /** allowlist(家族のメール)。正規化済み配列。 */
  allowedEmails: parseAllowedEmails(parsed.data.AUTH_ALLOWED_EMAILS),
};
