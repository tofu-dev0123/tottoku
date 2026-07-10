# アップロード (uploads)

書類追加は「①S3 への直接アップロード用 URL をもらう → ②クライアントが S3 へ直接 PUT → ③メタデータを登録（[documents](./documents.md) の POST）」の3ステップ。**ファイル実体は API を経由しない。**

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/uploads/presign` | アップロード用の署名付き PUT URL を発行 |

## POST /api/uploads/presign

署名はサーバー側でのみ行い、IAM 認証情報はクライアントへ渡さない。

**Request**

```json
{
  "filename": "契約書.pdf",
  "mime_type": "application/pdf",
  "size": 1048576
}
```

- `mime_type` は許可リスト（PDF / JPEG / PNG / HEIC / WebP）に限定。範囲外は **400**。
- `size` はファイルのバイト数。上限 **25MB** を超えると **400**。署名に `Content-Type` / `Content-Length` を束縛するため、クライアントは同じ MIME・サイズで PUT する必要がある（偽装・サイズ超過は S3 が拒否）。

**Response**

```json
{
  "upload_url": "https://<bucket>.s3.<region>.amazonaws.com/documents/9f3c....pdf?X-Amz-...",
  "s3_key": "documents/9f3c....pdf"
}
```

- `s3_key` はフラット（`documents/{uuid}.{ext}`）。フォルダ階層は S3 キーに埋め込まない。
- クライアントは `upload_url` へ **PUT** でファイル本体を送る（短命 URL）。
- 成功後、②で得た `s3_key` を [POST /api/documents](./documents.md) に渡してメタデータを登録する。
