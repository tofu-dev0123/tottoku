// クライアントストア(BootstrapData)からファイラー表示用の値を導出する純関数群。
// サーバー側の listFolders / getExpiringDocuments と同じ規則(直下=所属フォルダ一致、未分類=所属なし)で計算する。

import { addDays } from "@/lib/date";
import { buildBreadcrumb, collectDescendantIds, flattenTree } from "@/lib/folder-tree";
import type { BootstrapData, BootstrapDocument } from "@/server/bootstrap";
import type { ExpiringDocument } from "@/server/dashboard";

export type FilerFolder = { id: string; name: string; parentId: string | null; count: number };
export type FilerDocument = {
  id: string;
  title: string;
  createdAt: Date;
  expiryDate: string | null;
  folderNames: string[];
};
export type FilerCounts = { total: number; expiringSoon: number; unclassified: number };
export type FilerView = {
  currentFolderId: string | null;
  breadcrumb: { id: string | null; name: string }[];
  folders: FilerFolder[];
  documents: FilerDocument[];
};

// 書類詳細(GET /api/documents/:id と同じ形。s3_key はクライアントで使わないため持たない)。
export type DocumentDetailData = {
  id: string;
  title: string;
  mime_type: string;
  doc_date: string | null;
  expiry_date: string | null;
  memo: string | null;
  folders: { id: string; name: string }[];
  tags: string[];
  uploaded_by: { id: string; displayName: string } | null;
  updated_by: { id: string; displayName: string } | null;
  created_at: string;
  updated_at: string;
};

const ROOT_CRUMB = { id: null, name: "わが家の書類" };

/** 直下のフォルダ(名前順) + 各フォルダのサブツリー内の書類数。 */
export function childFolders(data: BootstrapData, parentId: string | null): FilerFolder[] {
  const docsByFolder = new Map<string, number>();
  for (const d of data.documents) {
    if (d.folderId) docsByFolder.set(d.folderId, (docsByFolder.get(d.folderId) ?? 0) + 1);
  }
  return data.folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))
    .map((f) => {
      // 所属フォルダは高々1つのため、サブツリー各フォルダの件数の単純合計が distinct 件数になる
      let count = docsByFolder.get(f.id) ?? 0;
      for (const id of collectDescendantIds(data.folders, f.id)) {
        count += docsByFolder.get(id) ?? 0;
      }
      return { id: f.id, name: f.name, parentId: f.parentId, count };
    });
}

// 一覧表示用の行へ変換(所属フォルダ名を添える)。
function toFilerDocuments(data: BootstrapData, docs: BootstrapDocument[]): FilerDocument[] {
  const names = new Map(data.folders.map((f) => [f.id, f.name]));
  return docs.map((d) => {
    const name = d.folderId ? names.get(d.folderId) : undefined;
    return {
      id: d.id,
      title: d.title,
      createdAt: new Date(d.createdAt),
      expiryDate: d.expiryDate,
      folderNames: name ? [name] : [],
    };
  });
}

const byCreatedDesc = (a: BootstrapDocument, b: BootstrapDocument) =>
  b.createdAt.localeCompare(a.createdAt);

/** その階層直下の書類(追加日の降順)。folderId=null はどのフォルダにも属さない書類(未分類)。 */
export function filerDocuments(data: BootstrapData, folderId: string | null): FilerDocument[] {
  return toFilerDocuments(
    data,
    data.documents.filter((d) => d.folderId === folderId).sort(byCreatedDesc),
  );
}

// 書類一覧/検索の絞り込み。条件は AND で組み合わせる。
export type DocumentListFilter = { q?: string; expiringWithin?: number; unclassified?: boolean };

/**
 * 書類一覧/検索。q はタイトルの部分一致(大文字小文字を区別しない)、
 * expiringWithin は 今日〜n日後 に期限がある書類。expiringWithin 指定時は期限の昇順、それ以外は追加日の降順。
 */
export function documentList(
  data: BootstrapData,
  filter: DocumentListFilter,
  today: string,
): FilerDocument[] {
  const q = filter.q?.toLowerCase();
  const until = filter.expiringWithin !== undefined ? addDays(today, filter.expiringWithin) : null;
  const docs = data.documents.filter(
    (d) =>
      (!q || d.title.toLowerCase().includes(q)) &&
      (!filter.unclassified || d.folderId === null) &&
      (until === null || (d.expiryDate !== null && d.expiryDate >= today && d.expiryDate <= until)),
  );
  docs.sort(
    until !== null
      ? (a, b) => (a.expiryDate ?? "").localeCompare(b.expiryDate ?? "")
      : byCreatedDesc,
  );
  return toFilerDocuments(data, docs);
}

/** ファイラーのメイン領域。folderId=null はルート。存在しないフォルダは null。 */
export function filerView(data: BootstrapData, folderId: string | null): FilerView | null {
  if (folderId !== null && !data.folders.some((f) => f.id === folderId)) return null;
  return {
    currentFolderId: folderId,
    breadcrumb:
      folderId === null ? [ROOT_CRUMB] : [ROOT_CRUMB, ...buildBreadcrumb(data.folders, folderId)],
    folders: childFolders(data, folderId),
    documents: filerDocuments(data, folderId),
  };
}

/** サイドバーの件数。期限が近い = 今日〜30日後(JST の today を渡す)。 */
export function filerCounts(data: BootstrapData, today: string): FilerCounts {
  const soon = addDays(today, 30);
  let expiringSoon = 0;
  let unclassified = 0;
  for (const d of data.documents) {
    if (d.expiryDate && d.expiryDate >= today && d.expiryDate <= soon) expiringSoon++;
    if (d.folderId === null) unclassified++;
  }
  return { total: data.documents.length, expiringSoon, unclassified };
}

/** 期限が今日以降の書類を期限の昇順で limit 件。モバイルホーム用。 */
export function expiringDocuments(
  data: BootstrapData,
  today: string,
  limit = 5,
): ExpiringDocument[] {
  const out: ExpiringDocument[] = [];
  for (const d of data.documents) {
    if (d.expiryDate && d.expiryDate >= today) {
      out.push({ id: d.id, title: d.title, expiryDate: d.expiryDate });
    }
  }
  return out.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)).slice(0, limit);
}

/** 書類詳細。存在しない(論理削除済みを含む)書類は null。 */
export function documentDetail(data: BootstrapData, id: string): DocumentDetailData | null {
  const d = data.documents.find((x) => x.id === id);
  if (!d) return null;
  const folder = d.folderId ? data.folders.find((f) => f.id === d.folderId) : undefined;
  const tagNames = new Map(data.tags.map((t) => [t.id, t.name]));
  const user = (uid: string | null) => data.users.find((u) => u.id === uid) ?? null;
  return {
    id: d.id,
    title: d.title,
    mime_type: d.mimeType,
    doc_date: d.docDate,
    expiry_date: d.expiryDate,
    memo: d.memo,
    folders: folder ? [{ id: folder.id, name: folder.name }] : [],
    tags: d.tagIds.flatMap((t) => tagNames.get(t) ?? []),
    uploaded_by: user(d.uploadedBy),
    updated_by: user(d.updatedBy),
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  };
}

/** 所属フォルダ選択肢(ツリー順・深さ付き)。 */
export function folderOptions(data: BootstrapData): { id: string; name: string; depth: number }[] {
  return flattenTree(data.folders);
}
