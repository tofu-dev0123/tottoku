# 書類 (documents)

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/documents` | 一覧（絞り込み・検索） |
| POST | `/api/documents` | メタデータ登録（S3 へ上げた後） |
| GET | `/api/documents/:id` | 詳細（メタデータ + 所属フォルダ + タグ） |
| GET | `/api/documents/:id/download` | ダウンロード用の署名付き GET URL を発行（短命） |
| PATCH | `/api/documents/:id` | 更新（folder_ids / tags も差し替え可） |
| DELETE | `/api/documents/:id` | 論理削除 |

論理削除された書類（`deleted_at` が非 NULL）は、一覧・詳細・検索に**出さない**。

## GET /api/documents

クエリで絞り込む。

| パラメータ | 例 | 説明 |
|---|---|---|
| `q` | 保険 | タイトル部分一致（第2フェーズで全文検索へ拡張） |
| `folder_id` | uuid / `none` | 指定フォルダ直下の書類。`none` は未分類（どのフォルダにも属さない） |
| `person` | 長男 | 対象者。folder/tag フィルタのエイリアス |
| `tag` | 自動車 | タグでの絞り込み |
| `year` | 2026 | `doc_date` の年 |
| `expiring_within` | 30 | 期限が N 日以内（JST 基準） |
| `sort` | doc_date_desc | 並び替え |
| `limit` / `cursor` | 20 / … | カーソルページング |

**Response**

```json
{
  "items": [
    {
      "id": "9f3c...",
      "title": "自動車保険 契約更新のご案内",
      "mime_type": "application/pdf",
      "doc_date": "2026-07-01",
      "expiry_date": "2026-07-17",
      "folders": [{ "id": "...", "name": "東京海上" }],
      "tags": ["自動車", "東京海上"]
    }
  ],
  "next_cursor": "eyJ..."
}
```

## POST /api/documents

②で S3 に上げた後、メタデータを登録する。`folder_ids` に複数渡せることが「複数フォルダ所属」の入口。`tags` は名前で受け取り、サーバー側で upsert する。

**Request**

```json
{
  "title": "自動車保険 契約更新のご案内",
  "s3_key": "documents/9f3c....pdf",
  "mime_type": "application/pdf",
  "doc_date": "2026-07-01",
  "expiry_date": "2026-07-17",
  "memo": "車検の時に一緒に提示。",
  "folder_ids": ["<契約>東京海上のid", "<保険>自動車のid"],
  "tags": ["自動車", "東京海上"]
}
```

必須は `title` / `s3_key` / `mime_type`。他は任意。`uploaded_by` はセッションの user を使う（body で受け取らない）。

**Response**: `201` 作成された書類（GET 詳細と同形）。

## GET /api/documents/:id

詳細。所属フォルダ・タグ・追加者/更新者を含む。

```json
{
  "id": "9f3c...",
  "title": "自動車保険 契約更新のご案内",
  "s3_key": "documents/9f3c....pdf",
  "mime_type": "application/pdf",
  "doc_date": "2026-07-01",
  "expiry_date": "2026-07-17",
  "memo": "車検の時に一緒に提示。",
  "folders": [{ "id": "...", "name": "東京海上" }],
  "tags": ["自動車", "東京海上"],
  "uploaded_by": { "id": "...", "displayName": "妻" },
  "updated_by": { "id": "...", "displayName": "夫" },
  "created_at": "2026-07-01T09:00:00.000Z",
  "updated_at": "2026-07-05T12:30:00.000Z"
}
```

## GET /api/documents/:id/download

ダウンロード用の短命な署名付き GET URL を発行する。

```json
{ "download_url": "https://<bucket>.s3...X-Amz-..." }
```

## PATCH /api/documents/:id

送られたフィールドのみ更新。`folder_ids` / `tags` を渡すと**差し替え**（全置換）。`updated_by` はセッションの user を設定する。

```json
{
  "title": "自動車保険 契約更新（更新済）",
  "expiry_date": "2027-07-17",
  "folder_ids": ["..."],
  "tags": ["自動車"]
}
```

**Response**: `200` 更新後の書類。

## DELETE /api/documents/:id

**論理削除**（`deleted_at` を立てるだけ）。S3 実体と行は残し、後日バッチで掃除する（[docs/db/invariants.md](../db/invariants.md)）。

**Response**: `204`。
