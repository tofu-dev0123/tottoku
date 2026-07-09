import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { drizzle } from "drizzle-orm/node-postgres";
import { like } from "drizzle-orm";
import { Pool } from "pg";
import { documents, users } from "./schema";

// 開発用サンプルデータ投入。ローカル docker(pg)向け。
// 実行: pnpm db:seed  (要 docker compose up -d + マイグレーション適用)
function dateAfter(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema: { users, documents } });

  // デモユーザー(既存なら再利用)
  const email = "demo@example.com";
  const existing = await db.select({ id: users.id }).from(users).where(like(users.email, email));
  const userId =
    existing[0]?.id ??
    (await db.insert(users).values({ email, displayName: "デモ" }).returning({ id: users.id }))[0]
      .id;

  // 既存のサンプル書類(s3_key が seed/ 始まり)を消してから入れ直す
  await db.delete(documents).where(like(documents.s3Key, "seed/%"));

  await db.insert(documents).values([
    {
      title: "自動車保険 契約書",
      s3Key: "seed/1.pdf",
      mimeType: "application/pdf",
      expiryDate: dateAfter(8),
      uploadedBy: userId,
    },
    {
      title: "長男 保育園 継続届",
      s3Key: "seed/2.pdf",
      mimeType: "application/pdf",
      expiryDate: dateAfter(23),
      uploadedBy: userId,
    },
    {
      title: "火災保険 証券",
      s3Key: "seed/3.pdf",
      mimeType: "application/pdf",
      expiryDate: dateAfter(40),
      uploadedBy: userId,
    },
  ]);

  const count = await db.select({ id: documents.id }).from(documents);
  console.log(`seed done: users=1, documents(total)=${count.length}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
