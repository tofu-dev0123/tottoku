import "server-only";
import { and, count, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { documentFolders, documents, folders } from "@/db/schema";
import { addDays, todayInJST } from "@/lib/date";

export type FolderSummary = { id: string; name: string; count: number };
export type FilerDocument = {
  id: string;
  title: string;
  createdAt: Date;
  expiryDate: string | null;
  folderNames: string[];
};
export type FilerCounts = { total: number; expiringSoon: number; unclassified: number };

// トップ階層フォルダと所属書類数(論理削除除外)。
export async function getFolderSummaries(): Promise<FolderSummary[]> {
  const rows = await db
    .select({
      id: folders.id,
      name: folders.name,
      count: count(documentFolders.documentId),
    })
    .from(folders)
    .leftJoin(documentFolders, eq(documentFolders.folderId, folders.id))
    .leftJoin(
      documents,
      and(eq(documents.id, documentFolders.documentId), isNull(documents.deletedAt)),
    )
    .where(isNull(folders.parentId))
    .groupBy(folders.id, folders.name)
    .orderBy(folders.name);
  return rows;
}

// filer に並べる書類(論理削除除外)+ 所属フォルダ名。作成日の新しい順。
export async function getFilerDocuments(): Promise<FilerDocument[]> {
  const docs = await db
    .select({
      id: documents.id,
      title: documents.title,
      createdAt: documents.createdAt,
      expiryDate: documents.expiryDate,
    })
    .from(documents)
    .where(isNull(documents.deletedAt))
    .orderBy(desc(documents.createdAt));

  if (docs.length === 0) return [];

  const links = await db
    .select({ documentId: documentFolders.documentId, name: folders.name })
    .from(documentFolders)
    .innerJoin(folders, eq(folders.id, documentFolders.folderId))
    .where(
      inArray(
        documentFolders.documentId,
        docs.map((d) => d.id),
      ),
    );

  const byDoc = new Map<string, string[]>();
  for (const l of links) {
    const arr = byDoc.get(l.documentId) ?? [];
    arr.push(l.name);
    byDoc.set(l.documentId, arr);
  }

  return docs.map((d) => ({ ...d, folderNames: byDoc.get(d.id) ?? [] }));
}

// サイドバー/タイル用の件数。
export async function getFilerCounts(): Promise<FilerCounts> {
  const today = todayInJST();
  const soon = addDays(today, 30);

  const [total] = await db
    .select({ c: count() })
    .from(documents)
    .where(isNull(documents.deletedAt));

  const [expiring] = await db
    .select({ c: count() })
    .from(documents)
    .where(
      and(
        isNull(documents.deletedAt),
        gte(documents.expiryDate, today),
        lte(documents.expiryDate, soon),
      ),
    );

  const [unclassified] = await db
    .select({ c: count() })
    .from(documents)
    .where(
      and(
        isNull(documents.deletedAt),
        sql`not exists (select 1 from ${documentFolders} where ${documentFolders.documentId} = ${documents.id})`,
      ),
    );

  return { total: total.c, expiringSoon: expiring.c, unclassified: unclassified.c };
}
