# ダッシュボード / アクティビティ

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/dashboard` | ホーム画面用。期限が近い書類 + 最近の追加 |
| GET | `/api/activity` | 最近の追加/更新（派生ビュー） |

## GET /api/dashboard

ホーム画面の起点。期限が近い書類と最近追加された書類をまとめて返す。

```json
{
  "expiring_soon": [
    { "id": "...", "title": "自動車保険 契約更新のご案内", "expiry_date": "2026-07-17" }
  ],
  "recent": [
    { "id": "...", "title": "健康診断結果", "created_at": "2026-07-05T09:00:00.000Z" }
  ]
}
```

- `expiring_soon` は期限が近い順（JST 基準）。`expiring_within` 相当のロジックを内部で使う。
- 論理削除された書類は含めない。

## GET /api/activity

「妻が○○を追加/更新しました」の通知用。**イベント履歴テーブルは持たず**、`documents` の `uploaded_by` / `updated_by` と `created_at` / `updated_at` から導く**「最近の追加/更新」ビュー**（決定 #3 / [docs/db/invariants.md](../db/invariants.md)）。

```json
{
  "items": [
    {
      "type": "created",
      "document": { "id": "...", "title": "健康診断結果" },
      "actor": { "id": "...", "displayName": "妻" },
      "at": "2026-07-05T09:00:00.000Z"
    },
    {
      "type": "updated",
      "document": { "id": "...", "title": "自動車保険 契約更新のご案内" },
      "actor": { "id": "...", "displayName": "夫" },
      "at": "2026-07-05T12:30:00.000Z"
    }
  ]
}
```

- 削除イベントや複数回の操作履歴は残らない（最新状態からの導出のため）。フルな履歴が必要になれば `activity` 表を後付けする。
