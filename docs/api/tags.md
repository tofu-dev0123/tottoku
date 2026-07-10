# タグ (tags)

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/tags` | 全タグ（絞り込み候補の表示用） |

## GET /api/tags

```json
{
  "items": [
    { "id": "...", "name": "自動車" },
    { "id": "...", "name": "東京海上" }
  ]
}
```

- タグの**作成は独立 API を持たない**。書類の作成/更新（[documents](./documents.md) の POST/PATCH）で名前を渡すと、サーバー側で既存タグを再利用 or 新規作成（upsert）して `document_tags` を張る。
