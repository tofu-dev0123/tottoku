import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { documentFolders, documentTags, documents, folders, tags, users } from "@/db/schema";
import { addDays, todayInJST } from "@/lib/date";
import { HttpError } from "@/lib/errors";
import { ALLOWED_MIME_TYPES } from "@/lib/upload-constraints";

// ---- スキーマ(コロケーション) --------------------------------------------

const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で指定してください");
const zTags = z.array(z.string().trim().min(1).max(50));
const zFolderIds = z.array(z.string().uuid());

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1, "タイトルは必須です").max(200),
  s3_key: z.string().trim().min(1),
  mime_type: z.enum(ALLOWED_MIME_TYPES),
  doc_date: zDate.nullable().optional(),
  expiry_date: zDate.nullable().optional(),
  memo: z.string().max(2000).nullable().optional(),
  folder_ids: zFolderIds.optional(),
  tags: zTags.optional(),
});

export const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    doc_date: zDate.nullable().optional(),
    expiry_date: zDate.nullable().optional(),
    memo: z.string().max(2000).nullable().optional(),
    folder_ids: zFolderIds.optional(),
    tags: zTags.optional(),
  })
  .refine(
    (v) =>
      [v.title, v.doc_date, v.expiry_date, v.memo, v.folder_ids, v.tags].some(
        (x) => x !== undefined,
      ),
    { message: "更新する項目がありません" },
  );

// 一覧のクエリ。person エイリアス / doc_date 並び替えは第2フェーズ(follow-up)。
export const listQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  // uuid か "none"(未分類)。
  folder_id: z
    .string()
    .refine((v) => v === "none" || z.string().uuid().safeParse(v).success, "folder_id が不正です")
    .optional(),
  tag: z.string().trim().min(1).optional(),
  year: z.coerce.number().int().min(1900).max(3000).optional(),
  expiring_within: z.coerce.number().int().min(0).max(3650).optional(),
  sort: z.enum(["created_desc", "created_asc"]).default("created_desc"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;

// ---- 内部ヘルパー ----------------------------------------------------------

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

// 書類の作成/更新時にタグを名前で upsert(既存は再利用・新規のみ作成)。
async function upsertTags(rawNames: string[]): Promise<{ id: string; name: string }[]> {
  const names = uniq(rawNames.map((n) => n.trim()).filter((n) => n.length > 0));
  if (names.length === 0) return [];
  // 競合(既存名)でも RETURNING に含めるため no-op update を当てる。
  return db
    .insert(tags)
    .values(names.map((name) => ({ name })))
    .onConflictDoUpdate({ target: tags.name, set: { name: sql`excluded.name` } })
    .returning({ id: tags.id, name: tags.name });
}

async function assertFoldersExist(ids: string[]): Promise<void> {
  const wanted = uniq(ids);
  if (wanted.length === 0) return;
  const rows = await db.select({ id: folders.id }).from(folders).where(inArray(folders.id, wanted));
  if (rows.length !== wanted.length) throw new HttpError(400, "存在しないフォルダが含まれています");
}

// 複数書類の所属フォルダ / タグをまとめて引く(N+1 回避)。
async function loadFolders(docIds: string[]): Promise<Map<string, { id: string; name: string }[]>> {
  const map = new Map<string, { id: string; name: string }[]>();
  if (docIds.length === 0) return map;
  const rows = await db
    .select({ documentId: documentFolders.documentId, id: folders.id, name: folders.name })
    .from(documentFolders)
    .innerJoin(folders, eq(folders.id, documentFolders.folderId))
    .where(inArray(documentFolders.documentId, docIds));
  for (const r of rows) {
    const list = map.get(r.documentId) ?? [];
    list.push({ id: r.id, name: r.name });
    map.set(r.documentId, list);
  }
  return map;
}

async function loadTags(docIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (docIds.length === 0) return map;
  const rows = await db
    .select({ documentId: documentTags.documentId, name: tags.name })
    .from(documentTags)
    .innerJoin(tags, eq(tags.id, documentTags.tagId))
    .where(inArray(documentTags.documentId, docIds));
  for (const r of rows) {
    const list = map.get(r.documentId) ?? [];
    list.push(r.name);
    map.set(r.documentId, list);
  }
  return map;
}

type CursorValue = { t: string; id: string };
function encodeCursor(c: CursorValue): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}
function decodeCursor(s: string): CursorValue {
  try {
    const o = JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
    if (typeof o?.t === "string" && typeof o?.id === "string") return { t: o.t, id: o.id };
  } catch {
    // fallthrough
  }
  throw new HttpError(400, "カーソルが不正です");
}

// Postgres unique 違反(s3_key 重複)判定。drizzle は cause にラップする。
function isUniqueViolation(e: unknown): boolean {
  const code = (x: unknown) =>
    typeof x === "object" && x !== null && "code" in x ? (x as { code: unknown }).code : undefined;
  if (code(e) === "23505") return true;
  if (typeof e === "object" && e !== null && "cause" in e) {
    return code((e as { cause: unknown }).cause) === "23505";
  }
  return false;
}

// ---- 参照系 ----------------------------------------------------------------

export async function listDocuments(query: ListQuery) {
  const conds = [isNull(documents.deletedAt)];

  if (query.q) conds.push(ilike(documents.title, `%${query.q}%`));

  if (query.folder_id === "none") {
    // どのフォルダにも属さない書類 = 未分類(設計書 §1)。
    conds.push(
      notExists(
        db
          .select({ x: sql`1` })
          .from(documentFolders)
          .where(eq(documentFolders.documentId, documents.id)),
      ),
    );
  } else if (query.folder_id) {
    conds.push(
      exists(
        db
          .select({ x: sql`1` })
          .from(documentFolders)
          .where(
            and(
              eq(documentFolders.documentId, documents.id),
              eq(documentFolders.folderId, query.folder_id),
            ),
          ),
      ),
    );
  }

  if (query.tag) {
    conds.push(
      exists(
        db
          .select({ x: sql`1` })
          .from(documentTags)
          .innerJoin(tags, eq(tags.id, documentTags.tagId))
          .where(and(eq(documentTags.documentId, documents.id), eq(tags.name, query.tag))),
      ),
    );
  }

  if (query.year !== undefined) {
    conds.push(sql`date_part('year', ${documents.docDate}) = ${query.year}`);
  }

  if (query.expiring_within !== undefined) {
    const today = todayInJST();
    const until = addDays(today, query.expiring_within);
    conds.push(
      and(
        isNotNull(documents.expiryDate),
        gte(documents.expiryDate, today),
        lte(documents.expiryDate, until),
      )!,
    );
  }

  const ascending = query.sort === "created_asc";
  if (query.cursor) {
    const c = decodeCursor(query.cursor);
    const t = new Date(c.t);
    // keyset ページング: (created_at, id) の複合キーで安定順序。
    conds.push(
      (ascending
        ? or(gt(documents.createdAt, t), and(eq(documents.createdAt, t), gt(documents.id, c.id)))
        : or(lt(documents.createdAt, t), and(eq(documents.createdAt, t), lt(documents.id, c.id))))!,
    );
  }

  const order = ascending
    ? [asc(documents.createdAt), asc(documents.id)]
    : [desc(documents.createdAt), desc(documents.id)];

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      mimeType: documents.mimeType,
      docDate: documents.docDate,
      expiryDate: documents.expiryDate,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(...conds))
    .orderBy(...order)
    .limit(query.limit + 1);

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const last = page.at(-1);
  const nextCursor =
    hasMore && last ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id }) : null;

  const ids = page.map((r) => r.id);
  const [folderMap, tagMap] = await Promise.all([loadFolders(ids), loadTags(ids)]);

  const items = page.map((r) => ({
    id: r.id,
    title: r.title,
    mime_type: r.mimeType,
    doc_date: r.docDate,
    expiry_date: r.expiryDate,
    folders: folderMap.get(r.id) ?? [],
    tags: tagMap.get(r.id) ?? [],
  }));

  return { items, next_cursor: nextCursor };
}

// 詳細(所属フォルダ・タグ・追加者/更新者を含む)。論理削除は 404。
export async function getDocumentDetail(id: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), isNull(documents.deletedAt)));
  if (!doc) throw new HttpError(404, "書類が見つかりません");

  const [folderMap, tagMap] = await Promise.all([loadFolders([id]), loadTags([id])]);

  const userIds = uniq([doc.uploadedBy, doc.updatedBy].filter((x): x is string => x !== null));
  const userRows = userIds.length
    ? await db
        .select({ id: users.id, displayName: users.displayName })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];
  const byUser = new Map(userRows.map((u) => [u.id, u]));

  return {
    id: doc.id,
    title: doc.title,
    s3_key: doc.s3Key,
    mime_type: doc.mimeType,
    doc_date: doc.docDate,
    expiry_date: doc.expiryDate,
    memo: doc.memo,
    folders: folderMap.get(id) ?? [],
    tags: tagMap.get(id) ?? [],
    uploaded_by: byUser.get(doc.uploadedBy) ?? null,
    updated_by: doc.updatedBy ? (byUser.get(doc.updatedBy) ?? null) : null,
    created_at: doc.createdAt.toISOString(),
    updated_at: doc.updatedAt.toISOString(),
  };
}

// ダウンロード署名用に s3_key を引く(論理削除は 404)。
export async function getDocumentForDownload(id: string) {
  const [doc] = await db
    .select({ id: documents.id, s3Key: documents.s3Key, mimeType: documents.mimeType })
    .from(documents)
    .where(and(eq(documents.id, id), isNull(documents.deletedAt)));
  if (!doc) throw new HttpError(404, "書類が見つかりません");
  return doc;
}

// ---- 更新系 ----------------------------------------------------------------

export async function createDocument(input: CreateDocumentInput, userId: string) {
  if (input.folder_ids) await assertFoldersExist(input.folder_ids);

  let id: string;
  try {
    const [row] = await db
      .insert(documents)
      .values({
        title: input.title.trim(),
        s3Key: input.s3_key,
        mimeType: input.mime_type,
        docDate: input.doc_date ?? null,
        expiryDate: input.expiry_date ?? null,
        memo: input.memo ?? null,
        uploadedBy: userId,
      })
      .returning({ id: documents.id });
    id = row.id;
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "この s3_key は既に登録されています");
    throw e;
  }

  if (input.folder_ids?.length) {
    await db
      .insert(documentFolders)
      .values(uniq(input.folder_ids).map((folderId) => ({ documentId: id, folderId })));
  }
  if (input.tags?.length) {
    const tagRows = await upsertTags(input.tags);
    if (tagRows.length) {
      await db.insert(documentTags).values(tagRows.map((t) => ({ documentId: id, tagId: t.id })));
    }
  }

  return getDocumentDetail(id);
}

export async function updateDocument(id: string, input: UpdateDocumentInput, userId: string) {
  // 論理削除済みは対象外。
  const [existing] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, id), isNull(documents.deletedAt)));
  if (!existing) throw new HttpError(404, "書類が見つかりません");

  if (input.folder_ids) await assertFoldersExist(input.folder_ids);

  const patch: Record<string, unknown> = { updatedBy: userId, updatedAt: new Date() };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.doc_date !== undefined) patch.docDate = input.doc_date;
  if (input.expiry_date !== undefined) patch.expiryDate = input.expiry_date;
  if (input.memo !== undefined) patch.memo = input.memo;
  await db.update(documents).set(patch).where(eq(documents.id, id));

  // folder_ids / tags は渡されたら全置換(設計書 §2)。
  if (input.folder_ids !== undefined) {
    await db.delete(documentFolders).where(eq(documentFolders.documentId, id));
    if (input.folder_ids.length) {
      await db
        .insert(documentFolders)
        .values(uniq(input.folder_ids).map((folderId) => ({ documentId: id, folderId })));
    }
  }
  if (input.tags !== undefined) {
    await db.delete(documentTags).where(eq(documentTags.documentId, id));
    const tagRows = await upsertTags(input.tags);
    if (tagRows.length) {
      await db.insert(documentTags).values(tagRows.map((t) => ({ documentId: id, tagId: t.id })));
    }
  }

  return getDocumentDetail(id);
}

// 論理削除(deleted_at を立てるだけ)。既に削除済み/存在しなければ 404。
export async function softDeleteDocument(id: string) {
  const [row] = await db
    .update(documents)
    .set({ deletedAt: new Date() })
    .where(and(eq(documents.id, id), isNull(documents.deletedAt)))
    .returning({ id: documents.id });
  if (!row) throw new HttpError(404, "書類が見つかりません");
}
