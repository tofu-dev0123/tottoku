# 家庭書類管理システム — データモデル & API 設計書

対象: 夫婦2名の個人利用 / Next.js (App Router) on Vercel / ストレージ S3 / DB サーバーレス PostgreSQL

設計の中核: **ファイル実体は S3 にフラット保存し、フォルダ・分類はすべてメタデータ (DB) で表現する。** フォルダは物理ディレクトリではなく「階層を持てるラベル」であり、1つの書類を複数のフォルダに同時に所属させられる。

---

## 1. データモデル (PostgreSQL)

### 1.1 users — 利用者 (夫婦2名)

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | 利用者ID |
| email | text | NOT NULL, UNIQUE | ログイン用。allowlist と照合 |
| display_name | text | NOT NULL | 表示名 (例「夫」「妻」)。通知の「妻が追加しました」に使う |
| created_at | timestamptz | NOT NULL, default now() | |

ログインは Auth.js の Google 認証を使い、`email` が allowlist (2名分) に含まれる場合のみ users に登録・許可する。パスワードは自前で持たない。

### 1.2 folders — フォルダ (自己参照で階層)

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | フォルダID |
| name | text | NOT NULL | フォルダ名 (例「東京海上」「長男」「2023年度」) |
| parent_id | uuid | FK → folders(id) ON DELETE CASCADE, NULL可 | 親フォルダ。NULL ならトップ階層 |
| created_by | uuid | FK → users(id) | 作成者 |
| created_at | timestamptz | NOT NULL, default now() | |

- `parent_id` の自己参照で無限に階層を作れる。
- 同一階層 (同じ parent_id) 内での名前重複を防ぐなら:
  `UNIQUE (parent_id, name)` を付ける。ただし parent_id が NULL の行同士は Postgres では UNIQUE 制約がすり抜けるため、トップ階層は部分インデックスで補う:
  `CREATE UNIQUE INDEX ON folders (name) WHERE parent_id IS NULL;`
- 循環参照 (A が B の子で B が A の子) はアプリ側で防ぐ。フォルダ移動時に「移動先が自分の子孫でないか」を検査する。

### 1.3 documents — 書類の実体 (1件1行)

ユーザーが入力する項目は `title` (必須) / `doc_date` / `expiry_date` / `memo` の4つのみ。
残りはシステムが裏で持つ項目。フォルダとタグはこのテーブルには持たず、多対多の別表 (document_folders / document_tags) で表現する。

| カラム | 型 | 制約 | 由来 | 説明 |
|---|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | システム | 書類ID |
| title | text | NOT NULL | 入力(必須) | タイトル |
| s3_key | text | NOT NULL, UNIQUE | システム | S3上のキー。例 `documents/{uuid}.pdf` (フラット) |
| mime_type | text | NOT NULL | システム | `application/pdf` `image/jpeg` など。プレビュー/DL判別 |
| doc_date | date | NULL可 | 入力(任意) | 書類の日付 (発行日など)。探す軸 |
| expiry_date | date | NULL可 | 入力(任意) | 更新・提出期限。通知に使う |
| memo | text | NULL可 | 入力(任意) | 自由メモ (例「車検の時に提示」) |
| uploaded_by | uuid | FK → users(id) | システム | 追加した人。通知に使う |
| created_at | timestamptz | NOT NULL, default now() | システム | |
| updated_at | timestamptz | NOT NULL, default now() | システム | |

**設計判断メモ:**
- `amount` (金額) は不採用 — シンプルさ優先。必要になれば `integer` (円単位) で後から追加。
- `file_size` / `page_count` は不採用 — 無くても動く付加情報。詳細画面で「PDF 2ページ / 284KB」等を出したくなったら、アップロード時に取得して追加する。
- `ocr_text` は現時点では不採用 — 全文検索を導入する第2フェーズで `text` 列として追加し、`search_tsv` の生成対象に含める (下記 1.6 参照)。それまで検索は `title` のみを対象にする。

### 1.4 document_folders — 書類⇄フォルダ (多対多)

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| document_id | uuid | FK → documents(id) ON DELETE CASCADE | |
| folder_id | uuid | FK → folders(id) ON DELETE CASCADE | |

- 複合主キー `PRIMARY KEY (document_id, folder_id)` で重複所属を防止。
- **この表が「1書類を複数フォルダに入れる」の実体。** ファイラー画面の「🗂 2」バッジは、ある document_id を持つ行数を数えたもの。
- 逆引き用に `CREATE INDEX ON document_folders (folder_id);` を張る (フォルダ内の書類一覧が高速化)。

### 1.5 tags / document_tags — タグ (多対多)

tags:

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| name | text | NOT NULL, UNIQUE | タグ名 (例「自動車」「東京海上」) |

document_tags:

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| document_id | uuid | FK → documents(id) ON DELETE CASCADE | |
| tag_id | uuid | FK → tags(id) ON DELETE CASCADE | |

複合主キー `PRIMARY KEY (document_id, tag_id)`。

### 1.6 全文検索のためのインデックス

**第1フェーズ (現在):** `title` のみを対象に検索する。専用インデックスは必須ではなく、`pg_trgm` による部分一致でも十分:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX documents_title_trgm_idx ON documents USING gin (title gin_trgm_ops);
```

これで `title ILIKE '%保険%'` のような部分一致が高速に効く。日本語の短いキーワードでも拾いやすい。

**第2フェーズ (OCR 導入後):** `ocr_text` 列を追加し、`title` と合わせた全文検索に拡張する:

```sql
ALTER TABLE documents ADD COLUMN ocr_text text;
ALTER TABLE documents ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(ocr_text,''))
  ) STORED;
CREATE INDEX documents_search_idx ON documents USING gin (search_tsv);
```

`simple` 構成で始め、精度が足りなければ前述の `pg_trgm` 部分一致を併用する。

---

## 2. API 設計

API の詳細（エンドポイント一覧・リクエスト/レスポンス例・クエリパラメータ）は [`docs/api/`](./api/) を正とする。

- 共通方針（認証必須・allowlist・JSON/ISO 8601・エラー `{ error }`・カーソルページング・ファイルは S3 直結）は [`docs/api/README.md`](./api/README.md)。
- 書類の削除は**論理削除**（`deleted_at`）。DB の詳細は [`docs/db/`](./db/) を参照。
- 期限リマインドは、クライアントを開いた時に `expiring_within` で出すのが最小構成。メール送信まで欲しい場合は Vercel Cron の日次バッチ（第2フェーズ）。

---

## 3. S3 バケット構成とセキュリティ

- バケットはパブリックアクセス**全ブロック**。オブジェクトへの到達は必ず署名付き URL 経由 (アップロードは PUT、ダウンロードは GET、いずれも短命)。
- 保存時暗号化: **SSE-S3** (または鍵管理をしたいなら SSE-KMS) を有効化。
- キー設計はフラット: `documents/{uuid}.{ext}`。フォルダ構造を S3 キーに埋め込まない (階層は DB が持つ)。
- ライフサイクル: 古い書類を Glacier Instant Retrieval 等へ移行してコスト削減 (任意)。
- IAM 認証情報は Vercel の環境変数へ。クライアントには絶対に渡さず、署名はサーバー側 (Route Handler) で行う。

---

## 4. 実装の着手順 (推奨)

1. DB スキーマ作成 (上記 SQL) + サーバーレス Postgres 接続。
2. Auth.js で Google ログイン + allowlist。
3. フォルダ CRUD (`/api/folders*`) と folders/tree。UI のファイラーが動く土台。
4. アップロード2フェーズ (`/api/uploads/presign` → S3 PUT → `/api/documents`)。
5. documents の一覧/詳細/更新/削除、署名付きダウンロード。
6. ダッシュボード (`/api/dashboard`) と期限絞り込み。
7. (第2フェーズ) `ocr_text` 列を追加して OCR 結果を投入し、`search_tsv` で全文検索を有効化。Vercel Cron で期限メール。
