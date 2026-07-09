# ファイル作成ルール

## 命名

- ファイル・ディレクトリは **kebab-case**（例: `document-list.tsx`）。
- React コンポーネントは**ファイル名・エクスポート名とも PascalCase**（例: `DocumentCard.tsx` → `export function DocumentCard`）。
- Route Handler は必ず **`route.ts`**、動的セグメントは **`[id]`**（例: `app/api/documents/[id]/route.ts`）。
- CloudFormation テンプレートは `infra/` に置き、**`cfn-tottoku-<用途/リソース名>.yaml`**（用途が一目で分かる命名。例 `cfn-tottoku-s3.yaml`）。

## Server / Client

- **デフォルトは Server Component。** `'use client'` はインタラクションが必要な葉のコンポーネントにのみ付ける。
- DB / S3 / 秘密情報に触るモジュール（`db/`・`lib/s3.ts`・`server/*` など）は**ファイル先頭で `import 'server-only'`** を付け、クライアントバンドルへの混入を防ぐ。

## 環境変数

- **`process.env` を直接参照しない。** `src/lib/env.ts` で Zod 検証した型付きオブジェクト経由でのみアクセスする。
- 新しい環境変数を足すときは `env.ts` のスキーマと `.env.example` の両方を更新する。

## import

- 親参照の相対 import ではなく **`@/*` エイリアス**（`@/lib/...`, `@/server/...`）を使う。

## Zod スキーマの置き場所

- リクエスト/レスポンスの Zod スキーマはドメイン単位で `src/server/<domain>.ts`（規模が大きければ `src/server/<domain>/schema.ts`）に置き、対応する処理とコロケーションする。

## 新規ファイル作成時のチェックリスト（Claude 向け）

1. 置き場所は [directory-structure](./directory-structure.md) の構成に従っているか。
2. `server-only` が必要なモジュールでないか（DB/S3/秘密情報）。
3. 環境変数は `env.ts` 経由になっているか。
4. **同じことをする関数が既に `db/`・`server/`・`lib/` に無いか先に確認**し、あれば再利用する。
