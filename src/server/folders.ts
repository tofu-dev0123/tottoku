import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { documentFolders, documents, folders } from "@/db/schema";
import {
  buildBreadcrumb,
  buildTree,
  canMove,
  collectDescendantIds,
  type FolderRow,
} from "@/lib/folder-tree";
import { HttpError } from "@/lib/errors";

// リクエスト検証スキーマ(コロケーション)
export const createFolderSchema = z.object({
  name: z.string().trim().min(1, "名前は必須です").max(100),
  parent_id: z.string().uuid().nullable().optional(),
});
export const updateFolderSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    parent_id: z.string().uuid().nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.parent_id !== undefined, {
    message: "更新する項目がありません",
  });

// Postgres unique 違反
function pgCode(e: unknown): string | undefined {
  if (typeof e === "object" && e !== null && "code" in e) {
    const c = (e as { code: unknown }).code;
    return typeof c === "string" ? c : undefined;
  }
  return undefined;
}

// drizzle は pg エラーを cause にラップするため、両方を見る。
function isUniqueViolation(e: unknown): boolean {
  if (pgCode(e) === "23505") return true;
  if (typeof e === "object" && e !== null && "cause" in e) {
    return pgCode((e as { cause: unknown }).cause) === "23505";
  }
  return false;
}

async function allFolderRows(): Promise<FolderRow[]> {
  return db
    .select({ id: folders.id, name: folders.name, parentId: folders.parentId })
    .from(folders);
}

// 直下のフォルダ + 各フォルダの「サブツリー内の書類数」。
// 件数は子孫フォルダのファイルも合算した distinct 件数(ファイルシステムの合計表示に合わせる)。
// parentId 省略時はトップ階層。データ量が小さい家庭利用のため、ツリー集計はアプリ側で行う。
export async function listFolders(
  parentId: string | null,
): Promise<{ id: string; name: string; parentId: string | null; count: number }[]> {
  const all = await allFolderRows();
  const children = all
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  if (children.length === 0) return [];

  // 論理削除を除いた 書類⇄フォルダ の紐付けを一括ロードし、フォルダ別の書類集合を作る。
  const links = await db
    .select({ documentId: documentFolders.documentId, folderId: documentFolders.folderId })
    .from(documentFolders)
    .innerJoin(
      documents,
      and(eq(documents.id, documentFolders.documentId), isNull(documents.deletedAt)),
    );
  const docsByFolder = new Map<string, Set<string>>();
  for (const l of links) {
    const set = docsByFolder.get(l.folderId) ?? new Set<string>();
    set.add(l.documentId);
    docsByFolder.set(l.folderId, set);
  }

  return children.map((f) => {
    const subtree = collectDescendantIds(all, f.id);
    subtree.add(f.id);
    const docIds = new Set<string>();
    for (const fid of subtree) {
      for (const id of docsByFolder.get(fid) ?? []) docIds.add(id);
    }
    return { id: f.id, name: f.name, parentId: f.parentId, count: docIds.size };
  });
}

export async function getFolderTree() {
  return buildTree(await allFolderRows());
}

// 書類の所属フォルダ選択 UI 用。ツリー順にフラット化し、深さ(depth)を添えて返す。
export async function getFolderOptions(): Promise<{ id: string; name: string; depth: number }[]> {
  const out: { id: string; name: string; depth: number }[] = [];
  const walk = (nodes: Awaited<ReturnType<typeof getFolderTree>>, depth: number) => {
    for (const n of nodes) {
      out.push({ id: n.id, name: n.name, depth });
      walk(n.children, depth + 1);
    }
  };
  walk(buildTree(await allFolderRows()), 0);
  return out;
}

// 1件 + パンくず + 直下の子フォルダ + 直下の書類。
export async function getFolderDetail(id: string) {
  const all = await allFolderRows();
  const self = all.find((f) => f.id === id);
  if (!self) throw new HttpError(404, "フォルダが見つかりません");

  const children = await listFolders(id);
  const docs = await db
    .select({
      id: documents.id,
      title: documents.title,
      expiryDate: documents.expiryDate,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(documentFolders, eq(documentFolders.documentId, documents.id))
    .where(and(eq(documentFolders.folderId, id), isNull(documents.deletedAt)))
    .orderBy(asc(documents.title));

  return {
    folder: { id: self.id, name: self.name, parentId: self.parentId },
    breadcrumb: buildBreadcrumb(all, id),
    children,
    documents: docs,
  };
}

export async function createFolder(input: z.infer<typeof createFolderSchema>, userId: string) {
  const parentId = input.parent_id ?? null;
  if (parentId) {
    const exists = await db
      .select({ id: folders.id })
      .from(folders)
      .where(eq(folders.id, parentId));
    if (exists.length === 0) throw new HttpError(400, "親フォルダが存在しません");
  }
  try {
    const [row] = await db
      .insert(folders)
      .values({ name: input.name.trim(), parentId, createdBy: userId })
      .returning();
    return row;
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "同じ場所に同名のフォルダがあります");
    throw e;
  }
}

export async function updateFolder(id: string, input: z.infer<typeof updateFolderSchema>) {
  const all = await allFolderRows();
  if (!all.some((f) => f.id === id)) throw new HttpError(404, "フォルダが見つかりません");

  if (input.parent_id !== undefined) {
    const res = canMove(all, id, input.parent_id ?? null);
    if (!res.ok) throw new HttpError(400, res.reason);
  }

  const patch: { name?: string; parentId?: string | null } = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.parent_id !== undefined) patch.parentId = input.parent_id ?? null;

  try {
    const [row] = await db.update(folders).set(patch).where(eq(folders.id, id)).returning();
    return row;
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "同じ場所に同名のフォルダがあります");
    throw e;
  }
}

// 削除の影響(read 専用)。UI の確認ダイアログ用:
//   descendantFolderCount … CASCADE で一緒に消える子孫フォルダ数(自分は除く)
//   documentCount         … サブツリー内で紐付けが解除される書類数(distinct・論理削除は除く)。
//                           書類本体は消えず、他フォルダに属さなくなったものが「未分類」になる。
export async function getFolderDeletionImpact(id: string) {
  const all = await allFolderRows();
  if (!all.some((f) => f.id === id)) throw new HttpError(404, "フォルダが見つかりません");

  const descendantIds = collectDescendantIds(all, id);
  const subtreeIds = [id, ...descendantIds];

  const [row] = await db
    .select({ c: sql<number>`count(distinct ${documentFolders.documentId})::int` })
    .from(documentFolders)
    .innerJoin(
      documents,
      and(eq(documents.id, documentFolders.documentId), isNull(documents.deletedAt)),
    )
    .where(inArray(documentFolders.folderId, subtreeIds));

  return { descendantFolderCount: descendantIds.size, documentCount: row?.c ?? 0 };
}

// 削除(子は CASCADE、document_folders も CASCADE。書類本体は残る)。
export async function deleteFolder(id: string) {
  const [row] = await db.delete(folders).where(eq(folders.id, id)).returning({ id: folders.id });
  if (!row) throw new HttpError(404, "フォルダが見つかりません");
}
