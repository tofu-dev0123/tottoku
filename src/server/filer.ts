import "server-only";
import { and, count, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
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

// filer に並べる書類 + 所属フォルダ名。folderId 指定時はそのフォルダ直下、null で全書類。
export async function getFilerDocuments(folderId: string | null): Promise<FilerDocument[]> {
  const cols = {
    id: documents.id,
    title: documents.title,
    createdAt: documents.createdAt,
    expiryDate: documents.expiryDate,
  };
  const docs =
    folderId === null
      ? await db
          .select(cols)
          .from(documents)
          .where(isNull(documents.deletedAt))
          .orderBy(desc(documents.createdAt))
      : await db
          .select(cols)
          .from(documents)
          .innerJoin(documentFolders, eq(documentFolders.documentId, documents.id))
          .where(and(eq(documentFolders.folderId, folderId), isNull(documents.deletedAt)))
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
