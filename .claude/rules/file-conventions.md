# ファイル作成ルール

## 命名

- ファイル・ディレクトリは **kebab-case**（例: `document-list.tsx`）。
- React コンポーネントは**ファイル名・エクスポート名とも PascalCase**（例: `DocumentCard.tsx` → `export function DocumentCard`）。
- Route Handler は必ず **`route.ts`**、動的セグメントは **`[id]`**（例: `app/api/documents/[id]/route.ts`）。
- CloudFormation テンプレートは `infra/` に置き、**`cfn-tottoku-<用途/リソース名>.yaml`**（用途が一目で分かる命名。例 `cfn-tottoku-s3.yaml`）。

## Server / Client

- **(filer) 配下の画面はクライアント描画（SPA 寄り）。** `src/app/(filer)/**/page.tsx` は入口のみ（`null` を返す）で、描画は `FilerApp` がクライアントストア（TanStack Query の bootstrap）から行う。設計は [docs/caching-strategy.md](../../docs/caching-strategy.md)。
  - 画面データは `useBootstrap()` + `src/lib/filer-derive.ts` の純関数で導出する。**画面ごとに API を fetch しない。**
  - (filer) 内の遷移は `AppLink` / `useAppRouter`（`next/link` / `useRouter().push` を直接使わない）。
  - 更新は `useStoreMutation`（楽観的更新）、削除は `useUndoableDelete` を使う。**`router.refresh()` で反映させない。** ストアの変換は `src/lib/store-updates.ts` の純関数に置く。
- **(filer) 外（通知・設定・ログイン・LP）とレイアウトは Server Component がデフォルト。** `'use client'` はインタラクションが必要な葉のコンポーネントにのみ付ける。
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
