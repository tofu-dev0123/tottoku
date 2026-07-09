import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { and, eq, isNull, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { documentFolders, documents, folders, users } from "./schema";

// 開発用サンプルデータ投入。ローカル docker(pg)向け。
// 実行: pnpm db:seed  (要 docker compose up -d + マイグレーション適用)
function dateAfter(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema: { users, folders, documents, documentFolders } });

  // デモユーザー(既存なら再利用)
  const email = "demo@example.com";
  const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  const userId =
    existingUser[0]?.id ??
    (await db.insert(users).values({ email, displayName: "デモ" }).returning({ id: users.id }))[0]
      .id;

  // トップ階層フォルダ(名前で get-or-create)
  const folderId: Record<string, string> = {};
  for (const name of ["契約", "保険", "長男", "医療"]) {
    const ex = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.name, name), isNull(folders.parentId)));
    folderId[name] =
      ex[0]?.id ??
      (
        await db.insert(folders).values({ name, createdBy: userId }).returning({ id: folders.id })
      )[0].id;
  }

  // 既存のサンプル書類(s3_key が seed/ 始まり)を消してから入れ直す(紐付けは CASCADE)
  await db.delete(documents).where(like(documents.s3Key, "seed/%"));

  const inserted = await db
    .insert(documents)
    .values([
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
      {
        title: "健康診断結果",
        s3Key: "seed/4.pdf",
        mimeType: "application/pdf",
        uploadedBy: userId,
      },
      { title: "住民票", s3Key: "seed/5.pdf", mimeType: "application/pdf", uploadedBy: userId },
    ])
    .returning({ id: documents.id, s3Key: documents.s3Key });

  const docId = Object.fromEntries(inserted.map((d) => [d.s3Key, d.id]));

  // フォルダ紐付け(住民票は未分類のまま)
  await db.insert(documentFolders).values([
    { documentId: docId["seed/1.pdf"], folderId: folderId["保険"] },
    { documentId: docId["seed/2.pdf"], folderId: folderId["長男"] },
    { documentId: docId["seed/3.pdf"], folderId: folderId["保険"] },
    { documentId: docId["seed/4.pdf"], folderId: folderId["医療"] },
  ]);

  console.log(
    `seed done: users=1, folders=${Object.keys(folderId).length}, documents=${inserted.length}`,
  );
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
