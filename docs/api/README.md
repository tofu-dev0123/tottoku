# API 設計

トットクの HTTP API 一覧。すべて Next.js の Route Handler（`src/app/api/**/route.ts`）。リソースごとに分割している。

## 目次

| ファイル | 範囲 |
|---|---|
| [auth.md](./auth.md) | 認証・セッション |
| [uploads.md](./uploads.md) | アップロード（presign 2フェーズ） |
| [documents.md](./documents.md) | 書類 CRUD・ダウンロード・検索 |
| [folders.md](./folders.md) | フォルダ CRUD・ツリー |
| [tags.md](./tags.md) | タグ |
| [dashboard.md](./dashboard.md) | ダッシュボード・アクティビティ |

## 共通方針

- **認証必須。** 全エンドポイントでセッションを検証し、email が allowlist（家族のメール）に含まれることを確認する。未認証・非許可は **401**。
- **入力検証は Zod。** body / query が不正なら **400**。
- **レスポンスは JSON。日時は ISO 8601 文字列。**
- **エラーは `{ "error": string }` で統一。** 内部詳細はユーザーに返さない（[coding-conventions](../../.claude/rules/coding-conventions.md)）。
- **一覧はカーソルページング**（`limit` / `cursor`）。
- **ファイル実体は API を経由しない。** アップロード/ダウンロードは S3 署名付き URL でクライアント↔S3 を直結し、API は URL 発行とメタデータ CRUD のみを担う（[セキュリティ](../data-model-and-api.md)）。
- **論理削除**された書類（`deleted_at` が非 NULL）は参照系のレスポンスに含めない（[docs/db/invariants.md](../db/invariants.md)）。

## エンドポイント一覧

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/auth/session` | ログイン状態と user 情報 |
| — | `/api/auth/*` | Auth.js（Google ログイン / コールバック / ログアウト） |
| POST | `/api/uploads/presign` | アップロード用の署名付き PUT URL を発行 |
| GET | `/api/documents` | 書類一覧（絞り込み・検索） |
| POST | `/api/documents` | 書類のメタデータ登録（S3 へ上げた後） |
| GET | `/api/documents/:id` | 書類詳細（メタデータ + 所属フォルダ + タグ） |
| GET | `/api/documents/:id/download` | ダウンロード用の署名付き GET URL を発行 |
| PATCH | `/api/documents/:id` | 書類メタデータ更新（folder_ids / tags も差し替え可） |
| DELETE | `/api/documents/:id` | 書類の論理削除 |
| GET | `/api/folders` | フォルダ一覧（`?parent_id=`） |
| GET | `/api/folders/tree` | 全フォルダの階層ツリー |
| GET | `/api/folders/:id` | フォルダ詳細（パンくず + 子 + 直下の書類） |
| POST | `/api/folders` | フォルダ作成 |
| PATCH | `/api/folders/:id` | リネーム / 移動（循環参照チェック必須） |
| DELETE | `/api/folders/:id` | フォルダ削除 |
| GET | `/api/tags` | 全タグ |
| GET | `/api/dashboard` | ホーム用（期限が近い書類 + 最近の追加） |
| GET | `/api/activity` | 最近の追加/更新（派生ビュー） |
