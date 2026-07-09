# CLAUDE.md — トットク

家庭書類管理システム。夫婦2名の個人利用。詳細仕様は `README.md` と `docs/data-model-and-api.md` を参照（設計書が仕様の起点）。

@AGENTS.md

## 技術スタック

- Next.js 16 (App Router, Turbopack) / React 19 / TypeScript / Tailwind CSS v4
- 認証: Auth.js + Google ログイン + allowlist（家族のメールのみ許可）
- ストレージ: Amazon S3（非公開・SSE・署名付き URL）
- DB: サーバーレス PostgreSQL（Neon / Supabase 想定）
- ホスティング: Vercel

## 開発環境（nix flakes 必須）

環境は nix flakes で管理。ホストの Node ではなく **flake の dev shell（Node 22 + pnpm）内で作業する**こと。

- direnv 利用時: `direnv allow` 済みならディレクトリ移動で自動的に環境へ入る
- 手動: `nix develop --command <cmd>` または `nix develop` でシェルに入る
- パッケージ管理は **pnpm**（npm/yarn を使わない）

```
pnpm dev            # 開発サーバ
pnpm build          # 本番ビルド
pnpm lint           # ESLint
pnpm format         # Prettier 整形
pnpm format:check   # 整形チェック（CI 用）
```

## ディレクトリ / 規約

- ソースは `src/`。import alias は `@/*` → `src/*`
- 設計書は `docs/`（`data-model-and-api.md` が仕様の正、`schema.sql` が DDL、`screens.html` がモック）

## ブランチ / コミット規約

- **default ブランチは `develop`**。作業は develop を基点に切る
- `main` は本番。develop → main の PR 経由でのみ反映
- 機能ブランチは `feature/<内容>` を develop から切る
- コミットは**明示的に依頼されたときのみ**作成する

## セキュリティ制約（厳守）

- **S3 バケットはパブリックアクセス全ブロック**。ファイルへの到達は必ず短命の署名付き URL 経由
- **署名はサーバー側でのみ**行う。ファイル実体は Vercel 関数を通さずクライアント↔S3 を直結（presign → 直接 PUT）
- IAM 認証情報・DB URL・認証シークレットは **環境変数（Vercel）にのみ**置く。**コードやリポジトリに絶対に埋め込まない**
- `.env*` はコミット禁止（`.gitignore` 済み、`.env.example` のみ可）
- 認証は allowlist（家族のメール）で制限。公開しない
