// クライアントストア(BootstrapData)からファイラー表示用の値を導出する純関数群。
// サーバー側の listFolders / getExpiringDocuments と同じ規則(直下=所属フォルダ一致、未分類=所属なし)で計算する。

import { addDays } from "@/lib/date";
import { buildBreadcrumb, collectDescendantIds } from "@/lib/folder-tree";
import type { BootstrapData } from "@/server/bootstrap";
import type { ExpiringDocument } from "@/server/dashboard";
import type { FilerCounts, FilerDocument, FilerFolder, FilerView } from "@/server/filer";

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

/** その階層直下の書類(追加日の降順)。folderId=null はどのフォルダにも属さない書類(未分類)。 */
export function filerDocuments(data: BootstrapData, folderId: string | null): FilerDocument[] {
  const names = new Map(data.folders.map((f) => [f.id, f.name]));
  return data.documents
    .filter((d) => d.folderId === folderId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((d) => {
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
