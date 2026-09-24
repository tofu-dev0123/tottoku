# Bootstrap API

SPA 寄り構成（#37）のクライアントストア（TanStack Query）へ載せる全メタデータを一括で返す。
家族2名・数百件規模のため全件を返し、一覧・件数・期限・未分類などの派生はクライアントで計算する（`src/lib/filer-derive.ts`）。

## GET `/api/bootstrap`

- 認証必須（未認証は 401）
- 初回表示は `(filer)` レイアウトがサーバー側で同じデータを取得し、`HydrationBoundary` でハイドレーションする。この API はクライアントからの再取得用
- **ファイル本体・`s3_key`・署名付き URL は含めない**（ファイル到達は従来どおり `/api/documents/:id/download`）
- 論理削除済みの書類は含めない

### レスポンス 200

```json
{
  "folders": [{ "id": "uuid", "name": "保険", "parentId": null }],
  "documents": [
    {
      "id": "uuid",
      "title": "火災保険 証券",
      "mimeType": "application/pdf",
      "docDate": "2026-04-01",
      "expiryDate": "2027-03-31",
      "memo": null,
      "folderId": "uuid",
      "tagIds": ["uuid"],
      "createdAt": "2026-04-01T09:00:00.000Z",
      "updatedAt": "2026-04-01T09:00:00.000Z"
    }
  ],
  "tags": [{ "id": "uuid", "name": "保険" }]
}
```

- `folderId` は所属フォルダ（高々1つ）。未分類は `null`
- 日時は ISO 8601 文字列、日付は `YYYY-MM-DD`
