import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { documentFolders, documents, folders } from "@/db/schema";
import { buildBreadcrumb, buildTree, canMove, type FolderRow } from "@/lib/folder-tree";
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

// 直下のフォルダ(+ 直下書類数)。parentId 省略時はトップ階層。
export async function listFolders(parentId: string | null) {
  return db
    .select({
      id: folders.id,
      name: folders.name,
      parentId: folders.parentId,
      count: sql<number>`count(${documentFolders.documentId})::int`,
    })
    .from(folders)
    .leftJoin(documentFolders, eq(documentFolders.folderId, folders.id))
    .leftJoin(
      documents,
      and(eq(documents.id, documentFolders.documentId), isNull(documents.deletedAt)),
    )
    .where(parentId === null ? isNull(folders.parentId) : eq(folders.parentId, parentId))
    .groupBy(folders.id, folders.name, folders.parentId)
    .orderBy(asc(folders.name));
}

export async function getFolderTree() {
  return buildTree(await allFolderRows());
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

// 削除(子は CASCADE、document_folders も CASCADE。書類本体は残る)。
export async function deleteFolder(id: string) {
  const [row] = await db.delete(folders).where(eq(folders.id, id)).returning({ id: folders.id });
  if (!row) throw new HttpError(404, "フォルダが見つかりません");
}
