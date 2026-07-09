import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  date,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// スキーマの正。設計は docs/db/tables.md を参照。
// 拡張(pgcrypto/pg_trgm)と updated_at トリガはマイグレーションSQL側で管理する。

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// 1.1 users — 利用者(夫婦2名)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt,
});

// 1.2 folders — フォルダ(自己参照で階層)
export const folders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => folders.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt,
  },
  (t) => [
    // 同一階層での名前重複を防ぐ(parent_id が非NULLの場合)
    unique("folders_parent_name_uniq").on(t.parentId, t.name),
    // トップ階層(parent_id IS NULL)は上の制約がすり抜けるため部分ユニークインデックスで補う
    uniqueIndex("folders_root_name_uniq")
      .on(t.name)
      .where(sql`${t.parentId} is null`),
  ],
);

// 1.3 documents — 書類の実体(1件1行)
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    s3Key: text("s3_key").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    docDate: date("doc_date"),
    expiryDate: date("expiry_date"),
    memo: text("memo"),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt,
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    // 論理削除。NULL=有効、非NULL=削除済み(docs/db/invariants.md)
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    // 期限での絞り込み(ホーム/通知)
    index("documents_expiry_idx")
      .on(t.expiryDate)
      .where(sql`${t.expiryDate} is not null`),
    // 第1フェーズの検索は title の部分一致(pg_trgm)
    index("documents_title_trgm_idx").using("gin", sql`${t.title} gin_trgm_ops`),
  ],
);

// 1.4 document_folders — 書類⇄フォルダ(多対多)
export const documentFolders = pgTable(
  "document_folders",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.documentId, t.folderId] }),
    // フォルダ内の書類一覧を高速化
    index("document_folders_folder_idx").on(t.folderId),
  ],
);

// 1.5 tags / document_tags — タグ(多対多)
export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
});

export const documentTags = pgTable(
  "document_tags",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.documentId, t.tagId] }),
    index("document_tags_tag_idx").on(t.tagId),
  ],
);
