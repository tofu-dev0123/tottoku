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
