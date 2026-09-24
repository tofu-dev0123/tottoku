// クライアントストア(BootstrapData)への楽観的更新。純関数で新しいデータを返す(元データは変更しない)。
// サーバー側の不変条件(同一階層の名前重複禁止・循環参照禁止・所属フォルダは高々1つ)と同じ規則で扱う。

import { canMove, collectDescendantIds } from "@/lib/folder-tree";
import type { BootstrapData, BootstrapDocument } from "@/server/bootstrap";

// ---- 検証(サーバーで弾かれる操作をダイアログ内で先に検出する) ----------------

/** 同じ階層に同名フォルダがあるか(exceptId は名前変更時の自分自身)。 */
export function hasFolderNameConflict(
  data: BootstrapData,
  parentId: string | null,
  name: string,
  exceptId?: string,
): boolean {
  const n = name.trim();
  return data.folders.some((f) => f.parentId === parentId && f.name === n && f.id !== exceptId);
}

/** フォルダを parentId の下へ移動できない理由。移動できるなら null。 */
export function folderMoveError(
  data: BootstrapData,
  id: string,
  parentId: string | null,
): string | null {
  const res = canMove(data.folders, id, parentId);
  if (!res.ok) return res.reason;
  const self = data.folders.find((f) => f.id === id);
  if (self && hasFolderNameConflict(data, parentId, self.name, id)) {
    return "移動先に同名のフォルダがあります";
  }
  return null;
}

/** 削除の影響(確認ダイアログ用)。サーバー側 getFolderDeletionImpact と同じ数え方。 */
export function folderDeletionImpact(
  data: BootstrapData,
  id: string,
): { descendantFolderCount: number; documentCount: number } {
  const descendants = collectDescendantIds(data.folders, id);
  const subtree = new Set([id, ...descendants]);
  return {
    descendantFolderCount: descendants.size,
    documentCount: data.documents.filter((d) => d.folderId !== null && subtree.has(d.folderId))
      .length,
  };
}

// ---- 楽観的更新 --------------------------------------------------------------

export function createFolder(
  data: BootstrapData,
  folder: { id: string; name: string; parentId: string | null },
): BootstrapData {
  return { ...data, folders: [...data.folders, { ...folder, name: folder.name.trim() }] };
}

export function renameFolder(data: BootstrapData, id: string, name: string): BootstrapData {
  return {
    ...data,
    folders: data.folders.map((f) => (f.id === id ? { ...f, name: name.trim() } : f)),
  };
}

export function moveFolder(
  data: BootstrapData,
  id: string,
  parentId: string | null,
): BootstrapData {
  return { ...data, folders: data.folders.map((f) => (f.id === id ? { ...f, parentId } : f)) };
}

/** フォルダと子孫を消す。所属していた書類は未分類になる(サーバーの CASCADE と同じ結果)。 */
export function deleteFolder(data: BootstrapData, id: string): BootstrapData {
  const removed = new Set([id, ...collectDescendantIds(data.folders, id)]);
  return {
    ...data,
    folders: data.folders.filter((f) => !removed.has(f.id)),
    documents: data.documents.map((d) =>
      d.folderId !== null && removed.has(d.folderId) ? { ...d, folderId: null } : d,
    ),
  };
}

export type DocumentPatch = {
  title?: string;
  docDate?: string | null;
  expiryDate?: string | null;
  memo?: string | null;
  folderId?: string | null;
  // タグは名前で渡す(サーバーは名前で upsert)。未知の名前は仮 id のタグとして足し、再取得で本 id に置き換わる。
  tagNames?: string[];
};

export function updateDocument(
  data: BootstrapData,
  id: string,
  patch: DocumentPatch,
  meta: { userId: string; now: string },
): BootstrapData {
  let tags = data.tags;
  let tagIds: string[] | undefined;
  if (patch.tagNames) {
    const byName = new Map(tags.map((t) => [t.name, t.id]));
    const added = patch.tagNames
      .filter((n) => !byName.has(n))
      .map((n) => ({ id: `pending:${n}`, name: n }));
    tags = [...tags, ...added];
    for (const t of added) byName.set(t.name, t.id);
    tagIds = patch.tagNames.map((n) => byName.get(n)!);
  }

  return {
    ...data,
    tags,
    documents: data.documents.map((d): BootstrapDocument => {
      if (d.id !== id) return d;
      return {
        ...d,
        ...(patch.title !== undefined && { title: patch.title.trim() }),
        ...(patch.docDate !== undefined && { docDate: patch.docDate }),
        ...(patch.expiryDate !== undefined && { expiryDate: patch.expiryDate }),
        ...(patch.memo !== undefined && { memo: patch.memo }),
        ...(patch.folderId !== undefined && { folderId: patch.folderId }),
        ...(tagIds && { tagIds }),
        updatedBy: meta.userId,
        updatedAt: meta.now,
      };
    }),
  };
}

export function deleteDocument(data: BootstrapData, id: string): BootstrapData {
  return { ...data, documents: data.documents.filter((d) => d.id !== id) };
}
