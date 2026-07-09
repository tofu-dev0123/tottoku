# インデックス戦略

第1フェーズで張るインデックスと根拠。過剰な索引は持たず、実際に効くクエリに絞る。

## 拡張

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- title の部分一致検索
```

## インデックス一覧

| 対象 | 定義 | 効かせたいクエリ |
|---|---|---|
| folders（トップ階層の名前一意） | `CREATE UNIQUE INDEX folders_root_name_uniq ON folders (name) WHERE parent_id IS NULL;` | `UNIQUE(parent_id, name)` がすり抜ける NULL 親の重複防止 |
| documents（期限絞り込み） | `CREATE INDEX documents_expiry_idx ON documents (expiry_date) WHERE expiry_date IS NOT NULL;` | ホーム/通知の `expiring_within`（期限が近い順） |
| documents（タイトル検索） | `CREATE INDEX documents_title_trgm_idx ON documents USING gin (title gin_trgm_ops);` | 検索画面の `title ILIKE '%…%'` 部分一致 |
| document_folders（逆引き） | `CREATE INDEX document_folders_folder_idx ON document_folders (folder_id);` | フォルダ内の書類一覧 |
| document_tags（逆引き） | `CREATE INDEX document_tags_tag_idx ON document_tags (tag_id);` | タグでの絞り込み |

## 論理削除との関係

- 一覧・検索・ダッシュボードは `WHERE deleted_at IS NULL` を伴う（[invariants.md](./invariants.md)）。
- 家庭内・小規模（数千件規模）では `deleted_at` 単体の索引は不要。件数が増え、有効行のみを高速に絞りたくなったら、既存の実用インデックスを**部分インデックス化**（`... WHERE deleted_at IS NULL`）して対応する。まず素の構成で始める。

## 第2フェーズ（OCR 導入後）

`title` に加え `ocr_text` を含めた全文検索へ拡張する。

```sql
ALTER TABLE documents ADD COLUMN ocr_text text;
ALTER TABLE documents ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(ocr_text,''))
  ) STORED;
CREATE INDEX documents_search_idx ON documents USING gin (search_tsv);
```

`simple` 構成で始め、精度が足りなければ `pg_trgm` 部分一致を併用する。
