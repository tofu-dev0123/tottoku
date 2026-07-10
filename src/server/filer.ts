import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  notExists,
  sql,
} from "drizzle-orm";
import { db } from "@/db/client";
import { documentFolders, documents, folders } from "@/db/schema";
import { addDays, todayInJST } from "@/lib/date";
import { getFolderDetail, listFolders } from "@/server/folders";

export type FilerDocument = {
  id: string;
  title: string;
  createdAt: Date;
  expiryDate: string | null;
  folderNames: string[];
};
export type FilerCounts = { total: number; expiringSoon: number; unclassified: number };
export type FilerFolder = Awaited<ReturnType<typeof listFolders>>[number];
export type FilerView = {
  currentFolderId: string | null;
  breadcrumb: { id: string | null; name: string }[];
  folders: FilerFolder[];
  documents: FilerDocument[];
};

const docCols = {
  id: documents.id,
  title: documents.title,
  createdAt: documents.createdAt,
  expiryDate: documents.expiryDate,
};
type DocRow = { id: string; title: string; createdAt: Date; expiryDate: string | null };

// 書類行に所属フォルダ名を後付けする(N+1 回避の一括ロード)。
async function attachFolderNames(docs: DocRow[]): Promise<FilerDocument[]> {
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

// filer に並べる書類 + 所属フォルダ名。folderId 指定時はそのフォルダ直下、null で全書類。
export async function getFilerDocuments(folderId: string | null): Promise<FilerDocument[]> {
  const docs =
    folderId === null
      ? await db
          .select(docCols)
          .from(documents)
          .where(isNull(documents.deletedAt))
          .orderBy(desc(documents.createdAt))
      : await db
          .select(docCols)
          .from(documents)
          .innerJoin(documentFolders, eq(documentFolders.documentId, documents.id))
          .where(and(eq(documentFolders.folderId, folderId), isNull(documents.deletedAt)))
          .orderBy(desc(documents.createdAt));
  return attachFolderNames(docs);
}

// サイドバー導線(期限が近い / 未分類 / 最近追加)と検索の一覧。
// expiringWithin 指定時は期限昇順、それ以外は追加日降順。
export type DocumentListFilter = {
  q?: string;
  expiringWithin?: number;
  unclassified?: boolean;
};

export async function getDocumentList(filter: DocumentListFilter): Promise<FilerDocument[]> {
  const conds = [isNull(documents.deletedAt)];
  if (filter.q) conds.push(ilike(documents.title, `%${filter.q}%`));
  if (filter.unclassified) {
    conds.push(
      notExists(
        db
          .select({ x: sql`1` })
          .from(documentFolders)
          .where(eq(documentFolders.documentId, documents.id)),
      ),
    );
  }
  if (filter.expiringWithin !== undefined) {
    const today = todayInJST();
    const until = addDays(today, filter.expiringWithin);
    conds.push(
      and(
        isNotNull(documents.expiryDate),
        gte(documents.expiryDate, today),
        lte(documents.expiryDate, until),
      )!,
    );
  }

  const order =
    filter.expiringWithin !== undefined ? asc(documents.expiryDate) : desc(documents.createdAt);

  const docs = await db
    .select(docCols)
    .from(documents)
    .where(and(...conds))
    .orderBy(order);
  return attachFolderNames(docs);
}

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

// filer ページ用の一括データ。folderId=null はルート(わが家の書類)。
export async function getFilerData(folderId: string | null): Promise<{
  sidebarFolders: FilerFolder[];
  counts: FilerCounts;
  view: FilerView;
}> {
  const [sidebarFolders, counts] = await Promise.all([listFolders(null), getFilerCounts()]);

  let view: FilerView;
  if (folderId === null) {
    const documents = await getFilerDocuments(null);
    view = {
      currentFolderId: null,
      breadcrumb: [{ id: null, name: "わが家の書類" }],
      folders: sidebarFolders,
      documents,
    };
  } else {
    const detail = await getFolderDetail(folderId); // 404 は HttpError
    const documents = await getFilerDocuments(folderId);
    view = {
      currentFolderId: folderId,
      breadcrumb: [{ id: null, name: "わが家の書類" }, ...detail.breadcrumb],
      folders: detail.children,
      documents,
    };
  }
  return { sidebarFolders, counts, view };
}
