import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { documentFolders, documents, documentTags, folders, tags, users } from "@/db/schema";

// クライアントストア(TanStack Query)へ一括で載せるメタデータ。
// 家族2名・数百件規模のため全件を返し、一覧/件数/期限などの派生はクライアントで計算する。
// ファイル本体・s3_key・署名付き URL は含めない(ファイル到達は従来どおり download API 経由)。
// 日時は ISO 8601 文字列(API 応答と RSC からのハイドレーションで同じ形にする)。
export type BootstrapFolder = { id: string; name: string; parentId: string | null };
export type BootstrapDocument = {
  id: string;
  title: string;
  mimeType: string;
  docDate: string | null;
  expiryDate: string | null;
  memo: string | null;
  // 所属フォルダは高々1つ(未分類 = null)
  folderId: string | null;
  tagIds: string[];
  // 追加者 / 最終更新者の user id(表示名は users から引く)
  uploadedBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};
export type BootstrapTag = { id: string; name: string };
// 利用者(家族)。書類詳細の「追加 / 更新」表示用で、email は含めない。
export type BootstrapUser = { id: string; displayName: string };
export type BootstrapData = {
  folders: BootstrapFolder[];
  documents: BootstrapDocument[];
  tags: BootstrapTag[];
  users: BootstrapUser[];
};

export async function getBootstrapData(): Promise<BootstrapData> {
  const [folderRows, docRows, folderLinks, tagLinks, tagRows, userRows] = await Promise.all([
    db.select({ id: folders.id, name: folders.name, parentId: folders.parentId }).from(folders),
    db
      .select({
        id: documents.id,
        title: documents.title,
        mimeType: documents.mimeType,
        docDate: documents.docDate,
        expiryDate: documents.expiryDate,
        memo: documents.memo,
        uploadedBy: documents.uploadedBy,
        updatedBy: documents.updatedBy,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(isNull(documents.deletedAt)),
    db
      .select({ documentId: documentFolders.documentId, folderId: documentFolders.folderId })
      .from(documentFolders)
      .innerJoin(
        documents,
        and(eq(documents.id, documentFolders.documentId), isNull(documents.deletedAt)),
      ),
    db
      .select({ documentId: documentTags.documentId, tagId: documentTags.tagId })
      .from(documentTags)
      .innerJoin(
        documents,
        and(eq(documents.id, documentTags.documentId), isNull(documents.deletedAt)),
      ),
    db.select({ id: tags.id, name: tags.name }).from(tags),
    db.select({ id: users.id, displayName: users.displayName }).from(users),
  ]);

  const folderByDoc = new Map<string, string>();
  for (const l of folderLinks) folderByDoc.set(l.documentId, l.folderId);
  const tagsByDoc = new Map<string, string[]>();
  for (const l of tagLinks) {
    const arr = tagsByDoc.get(l.documentId) ?? [];
    arr.push(l.tagId);
    tagsByDoc.set(l.documentId, arr);
  }

  return {
    folders: folderRows,
    documents: docRows.map((d) => ({
      ...d,
      folderId: folderByDoc.get(d.id) ?? null,
      tagIds: tagsByDoc.get(d.id) ?? [],
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    tags: tagRows,
    users: userRows,
  };
}
