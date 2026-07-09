-- 家庭書類管理システム — PostgreSQL スキーマ (第1フェーズ)
-- 設計書: docs/data-model-and-api.md に対応
-- 方針: ファイル実体は S3 にフラット保存。フォルダ/タグはメタデータで多対多表現。

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- title の部分一致検索

-- 1.1 users — 利用者 (夫婦2名)
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  display_name  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 1.2 folders — フォルダ (自己参照で階層)
CREATE TABLE folders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  parent_id   uuid REFERENCES folders(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- 同一階層での名前重複を防ぐ (parent_id が非NULL の場合)
  UNIQUE (parent_id, name)
);
-- トップ階層 (parent_id IS NULL) は UNIQUE 制約がすり抜けるため部分インデックスで補う
CREATE UNIQUE INDEX folders_root_name_uniq ON folders (name) WHERE parent_id IS NULL;

-- 1.3 documents — 書類の実体 (1件1行)
-- ユーザー入力: title(必須) / doc_date / expiry_date / memo
-- システム項目: id / s3_key / mime_type / uploaded_by / created_at / updated_at
CREATE TABLE documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  s3_key       text NOT NULL UNIQUE,
  mime_type    text NOT NULL,
  doc_date     date,
  expiry_date  date,
  memo         text,
  uploaded_by  uuid NOT NULL REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
-- 期限での絞り込み (ホーム/通知) を高速化
CREATE INDEX documents_expiry_idx ON documents (expiry_date) WHERE expiry_date IS NOT NULL;
-- 第1フェーズの検索は title の部分一致
CREATE INDEX documents_title_trgm_idx ON documents USING gin (title gin_trgm_ops);

-- 1.4 document_folders — 書類⇄フォルダ (多対多)。1書類を複数フォルダに入れる実体
CREATE TABLE document_folders (
  document_id  uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  folder_id    uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, folder_id)
);
-- フォルダ内の書類一覧を高速化
CREATE INDEX document_folders_folder_idx ON document_folders (folder_id);

-- 1.5 tags / document_tags — タグ (多対多)
CREATE TABLE tags (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL UNIQUE
);
CREATE TABLE document_tags (
  document_id  uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id       uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);
CREATE INDEX document_tags_tag_idx ON document_tags (tag_id);

-- updated_at 自動更新トリガ
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 第2フェーズ (OCR 導入後) — 必要になったら実行
-- ============================================================
-- ALTER TABLE documents ADD COLUMN ocr_text text;
-- ALTER TABLE documents ADD COLUMN search_tsv tsvector
--   GENERATED ALWAYS AS (
--     to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(ocr_text,''))
--   ) STORED;
-- CREATE INDEX documents_search_idx ON documents USING gin (search_tsv);
