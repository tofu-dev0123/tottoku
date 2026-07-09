import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit は .env を自動で読まないため、Next と同じ規則で .env.local などを読み込む。
loadEnvConfig(process.cwd());

// マイグレーションは direct(unpooled) 接続を使う(docs/db/migrations.md)。
// generate は DB 接続不要。migrate/studio 実行時に DATABASE_URL_UNPOOLED が必要。
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? "",
  },
  strict: true,
  verbose: true,
});
