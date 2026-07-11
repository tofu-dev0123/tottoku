# トットク — 家庭書類管理システム

> 家族の大事な書類を、大切にとっておく。

契約書・保険証券・子供の教育書類など、家庭に散らばりがちな書類を安全に管理するための Web アプリです。同じ家庭のメンバーであれば人数を問わず（allowlist に登録した家族全員で）共有して使えます。

**これは公開サービスではありません。** ソースコードを公開しているので、使いたい方は本 README の手順に沿って**自分のクラウド環境に構築**してご利用ください。運用は各自の責任で行ってください。

## コンセプト

- **ファイル実体は S3 にフラット保存**し、その上に検索性の高い管理レイヤー（メタデータ + UI）をかぶせる。
- **フォルダは物理ディレクトリではなくメタデータ上の「階層タグ」**。1つの書類を複数のフォルダに同時に所属させられ、後からの組み替えも安全。
- 手入力を前提に、保存時の必須項目は「タイトル」と「保存先フォルダ」の2つだけに絞る。

## 技術スタック

| 層              | 選択                                                   |
| --------------- | ------------------------------------------------------ |
| フロント / API  | Next.js 16 (App Router, Turbopack) on Vercel           |
| UI              | React 19 + Tailwind CSS v4                             |
| 言語            | TypeScript                                             |
| 認証            | Auth.js (NextAuth v5) + Google ログイン + allowlist    |
| ストレージ      | Amazon S3（パブリックアクセス全ブロック・SSE・署名付き URL） |
| メタデータ DB   | サーバーレス PostgreSQL（Neon）+ Drizzle ORM           |
| インフラ (AWS)  | CloudFormation（`infra/`）                             |

想定ランニングコストは月数十円程度（S3 の無料枠終了後）。

## 必要なもの

構築には以下のアカウント・ツールが必要です。

**アカウント / サービス**

- [Vercel](https://vercel.com/) — ホスティング
- [Neon](https://neon.tech/) — サーバーレス PostgreSQL（ランタイム接続用）
- AWS アカウント — S3 と IAM
- Google Cloud プロジェクト — OAuth クライアント（ログイン用）

**ローカルツール**

- Node.js 22 / pnpm — 本リポジトリは [nix flakes](https://nixos.org/) で開発環境を固定しています（後述）。nix を使わない場合は各自で Node 22 と pnpm を用意してください。
- [Docker](https://www.docker.com/) — ローカルでの DB マイグレーション適用・テスト用
- [AWS CLI](https://aws.amazon.com/cli/) — CloudFormation デプロイ用
- [Vercel CLI](https://vercel.com/docs/cli) — 環境変数取得・デプロイ用

## 構築手順

### 1. 取得と依存インストール

```bash
git clone https://github.com/tofu-dev0123/tottoku.git
cd tottoku
```

開発環境（Node 22 + pnpm）は nix flake で入ります。

```bash
# direnv 利用者
direnv allow            # 以降ディレクトリ移動で自動的に環境へ入る

# もしくは手動で dev shell に入る
nix develop

# 依存インストール（dev shell 内で）
pnpm install
```

> nix を使わない場合は、ホストに Node 22 と pnpm を用意してから `pnpm install` を実行してください。

### 2. 環境変数

`.env.example` をコピーして `.env.local` を作成し、値を埋めます（`.env*` はコミットしないでください）。

```bash
cp .env.example .env.local
```

| 変数                    | 説明                                                                       |
| ----------------------- | -------------------------------------------------------------------------- |
| `AUTH_SECRET`           | セッション署名用シークレット。`npx auth secret` などで生成                  |
| `AUTH_GOOGLE_ID`        | Google OAuth クライアント ID（手順 3）                                     |
| `AUTH_GOOGLE_SECRET`    | Google OAuth クライアントシークレット（手順 3）                            |
| `AUTH_ALLOWED_EMAILS`   | ログインを許可する家族のメール（カンマ区切り allowlist）                    |
| `DB_DRIVER`             | `neon`（既定）or `pg`（ローカル docker の素の PostgreSQL）                 |
| `DATABASE_URL`          | ランタイム用接続 URL。Neon なら pooled URL                                 |
| `DATABASE_URL_UNPOOLED` | マイグレーション用の direct（unpooled）URL                                 |
| `AWS_REGION`            | 例 `ap-northeast-1`（Vercel が上書きするため必ず明示）                     |
| `AWS_ROLE_ARN`          | presign 用 IAM ロールの ARN（手順 4 の CFN 出力 `RoleArn`）               |
| `S3_BUCKET`             | 書類保存バケット名（手順 4 で作成。例 `tottoku-documents-dev`）           |

> 環境変数は `src/lib/env.ts` の Zod スキーマで起動時に検証されます。過不足があると起動時に失敗します。

### 3. Google OAuth クライアント

1. [Google Cloud Console](https://console.cloud.google.com/) で OAuth 2.0 クライアント（種別: ウェブアプリケーション）を作成。
2. 承認済みリダイレクト URI に以下を追加。
   - ローカル: `http://localhost:3000/api/auth/callback/google`
   - 本番: `https://<あなたのドメイン>/api/auth/callback/google`
3. 発行された ID / シークレットを `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` に設定。

### 4. AWS リソース（CloudFormation）

`infra/` のテンプレートで S3 と IAM を作成します。**依存関係があるため、以下の順序で**デプロイしてください。テンプレート内の `TeamSlug` / `ProjectName` / `ProdOrigin` などのパラメータは**自分の Vercel チーム・ドメインの値に置き換えます**。

```bash
# (a) Vercel OIDC プロバイダ（AWS アカウントに1つだけ）
aws cloudformation deploy \
  --template-file infra/cfn-tottoku-oidc.yaml \
  --stack-name tottoku-oidc \
  --parameter-overrides TeamSlug=<your-vercel-team-slug> \
  --capabilities CAPABILITY_NAMED_IAM

# (b) S3 バケット（環境ごと。dev / prod を分けて作成）
aws cloudformation deploy \
  --template-file infra/cfn-tottoku-s3.yaml \
  --stack-name tottoku-s3-dev \
  --parameter-overrides Environment=dev ProdOrigin=https://<your-prod-domain>

# (c) presign 用 IAM ロール（oidc・s3 のあとに、環境ごと）
aws cloudformation deploy \
  --template-file infra/cfn-tottoku-iam.yaml \
  --stack-name tottoku-iam-dev \
  --parameter-overrides Environment=dev TeamSlug=<your-vercel-team-slug> ProjectName=<your-project> \
  --capabilities CAPABILITY_NAMED_IAM
```

- (c) の出力 `RoleArn` を `AWS_ROLE_ARN` に、(b) のバケット名を `S3_BUCKET` に設定します。
- 本番環境は `Environment=prod` で (b)(c) を再度デプロイしてください。
- IAM の信頼ポリシーには Vercel の team slug が条件キーとして埋め込まれます。slug を変える場合はテンプレート内のキー名も合わせて修正が必要です（テンプレート内コメント参照）。

### 5. データベース（マイグレーション）

スキーマの正は `src/db/schema.ts`、マイグレーションは `drizzle/` にコミット済みです。詳細は `docs/db/migrations.md` を参照してください。

**ローカルでマイグレーションを適用する場合**（`compose.yaml` の PostgreSQL を利用）:

```bash
docker compose up -d          # ローカル postgres を起動

# .env.local の DATABASE_URL / DATABASE_URL_UNPOOLED を docker の値にして:
# postgresql://tottoku:tottoku@localhost:5432/tottoku

pnpm db:migrate               # 未適用のマイグレーションを適用
```

- スキーマを変更するときは `src/db/schema.ts` を編集 → `pnpm db:generate` で SQL を生成 → レビュー → `pnpm db:migrate` → マイグレーションファイルごとコミット。
- 本番（Neon）へは、`DATABASE_URL_UNPOOLED` に本番の direct URL を指定して `pnpm db:migrate` を実行します。

### 6. ローカルで起動

```bash
pnpm dev                      # http://localhost:3000
```

- アプリ本体（`pnpm dev`）の DB 接続先は、**環境変数 `DB_DRIVER` によって**切り替わります（`src/db/client.ts`）。ローカルの docker PostgreSQL に直結するなら **環境変数 `DB_DRIVER=pg`** と docker の `DATABASE_URL` を指定します。Neon に繋ぐ場合は **環境変数 `DB_DRIVER=neon`（既定）** と Neon の接続 URL を指定します。
- S3 へのアクセスはローカルでも実 S3 を使います。`vercel env pull .env.local` で `VERCEL_OIDC_TOKEN` を取得すると、OIDC 経由で IAM ロールを assume できます。

### 7. デプロイ（Vercel）

1. Vercel にプロジェクトを作成し、本リポジトリを接続。
2. 手順 2 の環境変数を Vercel の環境変数（Production / Preview）に設定。AWS 認証は静的キーを持たず、Vercel OIDC → IAM ロール assume で行います。
3. デプロイ。本番ドメインは Google OAuth のリダイレクト URI と CFN の `ProdOrigin`（S3 CORS）に一致させてください。

## 開発コマンド

すべて nix dev shell 内 / pnpm で実行します。

```bash
pnpm dev            # 開発サーバ
pnpm build          # 本番ビルド
pnpm lint           # ESLint
pnpm typecheck      # 型チェック（tsc --noEmit）
pnpm format         # Prettier 整形
pnpm format:check   # 整形チェック（CI 用）
pnpm test           # Vitest
pnpm db:generate    # マイグレーション生成
pnpm db:migrate     # マイグレーション適用
pnpm db:studio      # Drizzle Studio
```

## リポジトリ構成

```
.
├─ src/
│  ├─ app/            … ルーティング（画面 + Route Handler）。/lp は公開ランディングページ
│  ├─ components/     … 再利用 UI コンポーネント
│  ├─ db/             … Drizzle スキーマ / クライアント（schema.ts が正）
│  ├─ lib/            … 認証・S3・env など横断ユーティリティ
│  ├─ server/         … ドメイン別のデータアクセス・サービス層
│  └─ types/          … 共有型
├─ infra/             … AWS リソースの CloudFormation テンプレート
├─ drizzle/           … 生成済みマイグレーション
└─ docs/
   ├─ data-model-and-api.md   … 全体設計（データモデル + S3 + 着手順）
   ├─ api/                    … API 設計（エンドポイント一覧・req/res）
   ├─ db/                     … DB 設計・マイグレーション手順
   └─ screens.html            … 全画面の静的モック
```

## 画面

0. **ログイン** — Google ログインのみ。allowlist で家族だけが入れる入口
1. **ホーム** — 期限が近い書類 + 検索窓。アプリの起点
2. **フォルダ（ファイラー）** — 自由に作れるフォルダを辿る。1書類が複数フォルダに顔を出す
3. **保存フォーム** — 撮る／選ぶ → フォルダ選択（複数可）+ 任意メタデータ
4. **検索結果** — キーワード + 多軸絞り込み
5. **書類詳細** — プレビュー・所属フォルダ・期限設定・メタデータ・メモ
6. **通知** — 期限リマインド + 家族の操作履歴

## データモデル（要点）

- `documents` … 書類の実体。ユーザー入力は `title`（必須）/ `doc_date` / `expiry_date` / `memo`。他はシステム項目
- `folders` … `parent_id` の自己参照で階層を表現（循環参照はアプリ側で防止）
- `document_folders` … 書類⇄フォルダの多対多（「複数フォルダ所属」の実体）
- `tags` / `document_tags` … タグの多対多

詳細と全カラム定義は `docs/data-model-and-api.md` と `docs/db/` を参照（スキーマの正は `src/db/schema.ts`）。

## セキュリティ方針

- S3 バケットはパブリックアクセス全ブロック。到達は必ず短命の署名付き URL 経由。
- ファイル実体は Vercel の関数を通さず、クライアント↔S3 を直結（presign → PUT / 短命の GET URL）。
- IAM 認証情報・DB URL・認証シークレットは環境変数（Vercel）のみに置き、コードに埋め込まない。`.env*` はコミット禁止（`.env.example` のみ）。
- 認証は allowlist で家族のメールのみ許可。一般公開はしない。

## ライセンス

[MIT License](./LICENSE)
