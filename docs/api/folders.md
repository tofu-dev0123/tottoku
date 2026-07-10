# フォルダ (folders)

フォルダは自己参照で階層を持つ「ラベル」。1 書類が複数フォルダに所属できる（実体は `document_folders`）。

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/folders` | 一覧。`?parent_id=` で直下の子。省略時はトップ階層 |
| GET | `/api/folders/tree` | 全フォルダを階層ツリー（JSON ネスト）で取得。フォルダ選択モーダル用 |
| GET | `/api/folders/:id` | 1件 + パンくず（祖先配列）+ 直下の子フォルダ + 直下の書類 |
| POST | `/api/folders` | 作成 |
| PATCH | `/api/folders/:id` | リネーム / 移動（`parent_id` 変更）。**循環参照チェック必須** |
| DELETE | `/api/folders/:id` | 削除 |

## GET /api/folders

`?parent_id=<uuid>` で直下の子のみ。省略時はトップ階層（`parent_id IS NULL`）。

```json
{
  "items": [
    { "id": "...", "name": "東京海上", "parent_id": null, "doc_count": 3 }
  ]
}
```

## GET /api/folders/tree

```json
[
  {
    "id": "...",
    "name": "契約",
    "children": [{ "id": "...", "name": "東京海上", "children": [] }]
  }
]
```

## GET /api/folders/:id

```json
{
  "folder": { "id": "...", "name": "東京海上", "parent_id": "..." },
  "breadcrumb": [{ "id": "...", "name": "契約" }, { "id": "...", "name": "東京海上" }],
  "children": [{ "id": "...", "name": "2023年度" }],
  "documents": [{ "id": "...", "title": "自動車保険 契約更新のご案内" }]
}
```

## POST /api/folders

```json
{ "name": "東京海上", "parent_id": null }
```

- 同一階層での名前重複は不可（`UNIQUE(parent_id, name)` とトップ階層の部分ユニークインデックス）。
- `created_by` はセッションの user。

**Response**: `201` 作成されたフォルダ。

## PATCH /api/folders/:id

リネーム（`name`）と移動（`parent_id`）。**移動時は循環参照チェック必須** — 移動先が自分自身または自分の子孫でないことを検証してから更新する（違反は 400）。

```json
{ "name": "東京海上日動", "parent_id": "<新しい親のid>" }
```

## DELETE /api/folders/:id

- 子フォルダは `ON DELETE CASCADE`。`document_folders` の紐付けも CASCADE で外れるが、**書類本体は消えない**。
- どのフォルダにも属さなくなった書類は「未分類」として [`GET /api/documents?folder_id=none`](./documents.md) で拾える。

**Response**: `204`。
