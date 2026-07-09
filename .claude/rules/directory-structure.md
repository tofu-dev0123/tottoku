# ディレクトリ構成

トットクの標準ディレクトリレイアウトと各階層の責務。**新規ファイルはこの構成に従って配置する。**

## src/ レイアウト

```
src/
├─ app/                 # ルーティング（画面 + Route Handler のみ）
│  ├─ api/**/route.ts   # API。設計書 §2 のパスと 1:1 対応
│  ├─ layout.tsx        # ルートレイアウト
│  ├─ globals.css       # 全体スタイル（Tailwind）
│  └─ <screen>/page.tsx # 画面
├─ components/          # 再利用 UI コンポーネント
├─ db/                  # Drizzle: schema.ts / client.ts（server-only）
├─ lib/                 # 横断ユーティリティ（auth.ts / s3.ts / env.ts など）
├─ server/              # ドメイン別データアクセス・サービス層（server-only）
└─ types/               # 共有型
```

### 各ディレクトリの責務

- **`app/`** — 画面（`page.tsx`）と Route Handler（`route.ts`）だけを置く。ロジックは持たせず薄く保つ。
- **`components/`** — 画面をまたいで使う UI。1画面専用の細かい部品は画面ディレクトリ内にコロケーションしてよい。
- **`db/`** — Drizzle のスキーマ定義（`schema.ts`）と DB クライアント（`client.ts`）。`server-only`。
- **`lib/`** — 認証設定（`auth.ts`）・S3 クライアント/署名（`s3.ts`）・環境変数（`env.ts`）など横断的なユーティリティ。
- **`server/`** — ドメイン別（documents / folders / tags など）のデータアクセスとビジネスロジック。SQL/Drizzle クエリはここに集約する。`server-only`。
- **`types/`** — 複数箇所で共有する型のみ。Drizzle 推論・Zod `z.infer` で導ける型はここに重複定義しない。

### 層の原則

**DB / S3 / 秘密情報に触るコードは `db/`・`lib/`・`server/` に集約し、`app/` の Route Handler は「認証 → 入力検証 → server 層の呼び出し → JSON 応答」の薄い接続だけを担う。**

## ルート直下

- `drizzle.config.ts` — Drizzle Kit 設定（migration 出力先は `drizzle/`）
- `drizzle/` — 生成された migration（将来）
- `infra/` — **AWS リソースは CloudFormation テンプレートで管理**し、すべてここに置く。
  - ファイル名は `cfn-tottoku-<用途/リソース名>.yaml`（例: `cfn-tottoku-s3.yaml`、`cfn-tottoku-iam.yaml`）
  - S3（パブリックアクセス全ブロック・SSE・ライフサイクル）、署名用 IAM などを定義。AWS リソースはコンソールで手動作成せずテンプレートで管理する。

## API パス → ファイル対応（設計書 §2）

| API パス | ファイル | メソッド |
|---|---|---|
| `/api/auth/*` | `app/api/auth/[...nextauth]/route.ts` | Auth.js |
| `/api/uploads/presign` | `app/api/uploads/presign/route.ts` | POST |
| `/api/documents` | `app/api/documents/route.ts` | GET(一覧) / POST(作成) |
| `/api/documents/:id` | `app/api/documents/[id]/route.ts` | GET / PATCH / DELETE |
| `/api/documents/:id/download` | `app/api/documents/[id]/download/route.ts` | GET |
| `/api/folders` | `app/api/folders/route.ts` | GET / POST |
| `/api/folders/tree` | `app/api/folders/tree/route.ts` | GET |
| `/api/folders/:id` | `app/api/folders/[id]/route.ts` | GET / PATCH / DELETE |
| `/api/tags` | `app/api/tags/route.ts` | GET |
| `/api/dashboard` | `app/api/dashboard/route.ts` | GET |
| `/api/activity` | `app/api/activity/route.ts` | GET |
