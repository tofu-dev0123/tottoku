# テーブル定義

第1フェーズの全テーブル。型は PostgreSQL。実体は `src/db/schema.ts`（Drizzle）を正とする（[migrations.md](./migrations.md)）。

## users — 利用者（夫婦2名）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | 利用者 ID |
| email | text | NOT NULL, UNIQUE | ログイン用。allowlist と照合 |
| display_name | text | NOT NULL | 表示名（例「夫」「妻」）。通知に使う |
| created_at | timestamptz | NOT NULL, default now() | |

- Google ログインし、`email` が allowlist に含まれる場合のみ登録・許可。パスワードは持たない。
- users は**初回ログイン時に upsert**する（手動 seed 不要）。

## folders — フォルダ（自己参照で階層）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | フォルダ ID |
| name | text | NOT NULL | フォルダ名（例「東京海上」「長男」） |
| parent_id | uuid | FK → folders(id) ON DELETE CASCADE, NULL可 | 親。NULL はトップ階層 |
| created_by | uuid | NOT NULL, FK → users(id) | 作成者 |
| created_at | timestamptz | NOT NULL, default now() | |

- 名前重複防止: `UNIQUE (parent_id, name)`。トップ階層（parent_id IS NULL）は制約がすり抜けるため部分ユニークインデックスで補う（[indexes.md](./indexes.md)）。
- 循環参照はアプリ側で防止（[invariants.md](./invariants.md)）。

## documents — 書類の実体（1件1行）

ユーザー入力は `title`（必須）/ `doc_date` / `expiry_date` / `memo`。他はシステム項目。

| カラム | 型 | 制約 | 由来 | 説明 |
|---|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | システム | 書類 ID |
| title | text | NOT NULL | 入力(必須) | タイトル |
| s3_key | text | NOT NULL, UNIQUE | システム | S3 キー。例 `documents/{uuid}.pdf`（フラット） |
| mime_type | text | NOT NULL | システム | `application/pdf` など。プレビュー/DL 判別 |
| doc_date | date | NULL可 | 入力(任意) | 書類の日付。探す軸 |
| expiry_date | date | NULL可 | 入力(任意) | 更新・提出期限。通知に使う |
| memo | text | NULL可 | 入力(任意) | 自由メモ |
| uploaded_by | uuid | NOT NULL, FK → users(id) | システム | 追加した人 |
| **updated_by** | uuid | **NULL可, FK → users(id)** | システム | **最後に更新した人。PATCH 時に設定（決定#3）** |
| created_at | timestamptz | NOT NULL, default now() | システム | |
| updated_at | timestamptz | NOT NULL, default now() | システム | 更新時トリガで自動更新（[migrations.md](./migrations.md)） |
| **deleted_at** | timestamptz | **NULL可** | システム | **論理削除（決定#2）。NULL=有効、非NULL=削除済み** |

**設計判断メモ:**
- `amount` / `file_size` / `page_count` は不採用（シンプルさ優先。必要になれば後付け）。
- `ocr_text` / `search_tsv` は第2フェーズで追加（[indexes.md](./indexes.md)）。
- 「対象者(person)」専用カラムは持たない。フォルダ or タグ（例「長男」「妻」）で表現する。

## document_folders — 書類⇄フォルダ（所属テーブル）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| document_id | uuid | NOT NULL, FK → documents(id) ON DELETE CASCADE | |
| folder_id | uuid | NOT NULL, FK → folders(id) ON DELETE CASCADE | |

- 複合主キー `PRIMARY KEY (document_id, folder_id)`。構造は多対多だが**アプリ層で 1書類=最大1行**に制約（[invariants.md](./invariants.md)）。
- 1行も無い書類が「未分類」。

## tags / document_tags — タグ（多対多）

**tags:**

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| name | text | NOT NULL, UNIQUE | タグ名 |

**document_tags:**

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| document_id | uuid | NOT NULL, FK → documents(id) ON DELETE CASCADE | |
| tag_id | uuid | NOT NULL, FK → tags(id) ON DELETE CASCADE | |

- 複合主キー `PRIMARY KEY (document_id, tag_id)`。
- タグは書類の作成/更新時に名前で upsert（[invariants.md](./invariants.md)）。
