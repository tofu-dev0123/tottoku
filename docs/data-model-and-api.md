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

## 2. API 設計 (Next.js Route Handlers)

### 共通方針

- すべて `/api/*` の Route Handler。Vercel の Serverless Function 制限 (ペイロード 4.5MB、実行時間) を踏まえ、**ファイル実体は API を経由させない。** アップロード/ダウンロードは S3 署名付き URL でクライアント↔S3 を直結し、API は「URL 発行」と「メタデータ CRUD」だけを担う。
- 全エンドポイントで認証必須。セッションの email が allowlist に含まれることを検証。
- レスポンスは JSON。日時は ISO 8601 文字列。

### 2.1 認証

| メソッド | パス | 説明 |
|---|---|---|
| GET | /api/auth/session | 現在のログイン状態と user 情報 |
| — | (Auth.js が /api/auth/* を提供) | Google ログイン / コールバック / ログアウト |

### 2.2 アップロード (2フェーズ方式)

書類追加は「①S3への直接アップロード用URLをもらう → ②クライアントがS3へ直接PUT → ③メタデータを登録」の3ステップ。

| メソッド | パス | 説明 |
|---|---|---|
| POST | /api/uploads/presign | アップロード用の署名付き PUT URL を発行。body: `{ filename, mime_type }` → returns: `{ upload_url, s3_key }` |
| POST | /api/documents | ②で S3 に上げた後、メタデータを登録。body 下記。document を作成し folders/tags も紐付け |

`POST /api/documents` の body 例:

```json
{
  "title": "自動車保険 契約更新のご案内",
  "s3_key": "documents/9f3c...pdf",
  "mime_type": "application/pdf",
  "doc_date": "2026-07-01",
  "expiry_date": "2026-07-17",
  "memo": "車検の時に一緒に提示。",
  "folder_ids": ["<契約>東京海上のid", "<保険>自動車のid"],
  "tags": ["自動車", "東京海上"]
}
```

`folder_ids` に複数渡せることが「複数フォルダ所属」の入口。`tags` は名前で受け取り、サーバー側で既存タグを探すか新規作成 (upsert) して document_tags を張る。

### 2.3 書類 (documents)

| メソッド | パス | 説明 |
|---|---|---|
| GET | /api/documents | 一覧。クエリで絞り込み (下記) |
| GET | /api/documents/:id | 1件の詳細 (メタデータ + 所属フォルダ + タグ) |
| GET | /api/documents/:id/download | ダウンロード用の署名付き GET URL を発行 (短命) |
| PATCH | /api/documents/:id | メタデータ更新。folder_ids / tags も差し替え可 |
| DELETE | /api/documents/:id | 削除 (DB行削除 + S3オブジェクト削除) |

`GET /api/documents` のクエリパラメータ:

| パラメータ | 例 | 説明 |
|---|---|---|
| q | 保険 | 全文検索 (title + ocr_text)。検索画面 |
| folder_id | uuid | 指定フォルダ直下の書類。ファイラー画面 |
| person | 長男 | 対象者での絞り込み ※注 |
| tag | 自動車 | タグでの絞り込み |
| year | 2026 | doc_date の年での絞り込み |
| expiring_within | 30 | 期限が N 日以内。ホーム/通知画面 |
| sort | doc_date_desc | 並び替え |
| limit / cursor | 20 / … | ページング |

※注「対象者 (person)」: 専用カラムを設けず、「長男」「妻」などのフォルダ or タグで表現する設計。person フィルタは実際には folder/tag フィルタのエイリアスとして実装してよい。

### 2.4 フォルダ (folders)

| メソッド | パス | 説明 |
|---|---|---|
| GET | /api/folders | フォルダ一覧。`?parent_id=` で直下の子だけ取得。省略時はトップ階層 |
| GET | /api/folders/tree | 全フォルダを階層ツリー構造 (JSON ネスト) で取得。フォルダ選択モーダル用 |
| GET | /api/folders/:id | 1件 + パンくず (祖先の配列) + 直下の子フォルダ + 直下の書類 |
| POST | /api/folders | 作成。body: `{ name, parent_id }` |
| PATCH | /api/folders/:id | リネーム / 移動 (parent_id 変更)。※循環参照チェック必須 |
| DELETE | /api/folders/:id | 削除。子フォルダは CASCADE。document_folders の紐付けも CASCADE で外れるが、documents 本体は消えない (他フォルダに残る/どこにも無ければ孤立) |

削除時の「孤立書類」対策: フォルダ削除でどのフォルダにも属さなくなった書類を、UI 上「未分類」として拾えるようにする。実装は `GET /api/documents?folder_id=none` のような特別値で、document_folders に1行も無い書類を返す。

### 2.5 タグ (tags)

| メソッド | パス | 説明 |
|---|---|---|
| GET | /api/tags | 全タグ (絞り込み候補の表示用) |

タグの作成は書類の作成/更新時に暗黙 upsert するため、独立した POST は必須ではない。

### 2.6 通知 / ダッシュボード

| メソッド | パス | 説明 |
|---|---|---|
| GET | /api/dashboard | ホーム画面用。期限が近い書類 + 最近の追加をまとめて返す |
| GET | /api/activity | 「妻が○○を追加」等の操作履歴 (通知画面下段) |

期限リマインドは、クライアントを開いた時に `expiring_within` で出すのが最小構成。プッシュ通知やメール送信まで欲しい場合は Vercel Cron で日次バッチを組み、期限が近い書類を検出してメール送信する (第2フェーズ)。activity ログを独立テーブルにするかは、必要になってから追加でよい。

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
