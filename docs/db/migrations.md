# マイグレーション運用

DB は **Neon**（サーバーレス PostgreSQL）。スキーマは **Drizzle ORM** で定義し、マイグレーションは **drizzle-kit** で生成、**GitHub Actions** で適用する。

## スキーマの正（決定#1）

- **`src/db/schema.ts`（Drizzle）が唯一の正。**
- スキーマ変更は `schema.ts` を編集 → `drizzle-kit generate` で `drizzle/` に SQL マイグレーションを生成 → コミット。
- 旧 `docs/schema.sql`（手書き DDL）は廃止。DDL の実体は drizzle-kit 生成の `drizzle/` を正とする。

## 接続（2系統）

Neon は用途別に接続文字列を払い出す。**ランタイムとマイグレーションで使い分ける。**

| 用途 | 接続 | ドライバ | 環境変数（例） |
|---|---|---|---|
| ランタイム（Route Handler） | **pooled**（pgbouncer 経由） | `@neondatabase/serverless` + `drizzle-orm/neon-http` | `DATABASE_URL` |
| マイグレーション（drizzle-kit） | **direct / unpooled** | drizzle-kit | `DATABASE_URL_UNPOOLED` |

- pooler 経由はマイグレーション（DDL・トランザクション）が不安定になり得るため、drizzle-kit は必ず direct URL を使う。
- 秘密情報は環境変数のみ（`src/lib/env.ts` 経由。[file-conventions](../../.claude/rules/file-conventions.md)）。ローカルは `.env.local`、本番は Vercel、CI は GitHub Secrets。

## ローカル開発（Docker）

ローカルは `compose.yaml` の PostgreSQL を使う（用途: drizzle-kit のマイグレーションと Vitest 統合テスト）。

```
docker compose up -d          # 起動（postgres:17-alpine, localhost:5432）
# .env.local に下記を設定
#   DATABASE_URL=postgresql://tottoku:tottoku@localhost:5432/tottoku
#   DATABASE_URL_UNPOOLED=postgresql://tottoku:tottoku@localhost:5432/tottoku
docker compose down           # 停止（データは名前付きボリュームに残る）
docker compose down -v        # 破棄（データも消す。作り直したいとき）
```

- `pgcrypto` / `pg_trgm` 拡張はマイグレーション内の `CREATE EXTENSION IF NOT EXISTS` で作成される（標準 postgres イメージに含まれる）。
- **アプリ本体（`pnpm dev`）はローカル DB に直接繋がない。** ランタイムの neon-http ドライバは Neon の HTTP エンドポイント前提のため、アプリ dev は Neon の dev/staging ブランチに接続する。

### ローカルのマイグレーション運用

**CI と同じ generate+migrate フローに統一する。`drizzle-kit push` は使わない**（コミットする成果物は必ず生成済みマイグレーションファイルであること。PR のドリフト検査が担保する）。接続は `DATABASE_URL_UNPOOLED`（ローカルは docker の値）。

```
# スキーマを変える人
1. src/db/schema.ts を編集
2. pnpm db:generate                 # drizzle/ に SQL マイグレーション生成（コミット対象）
3. 生成された SQL をレビュー
4. docker compose up -d && pnpm db:migrate   # ローカル(docker)へ適用して確認
5. Vitest 統合テストで確認
6. migration ファイルごとコミット   # develop→staging, main→本番 と同じファイルが流れる

# 変更を取り込む人（pull 後）
pnpm db:migrate                     # 未適用分をローカルに適用
```

- 適用済みは drizzle の journal（`__drizzle_migrations`）で管理。**local / staging / 本番で同じ仕組み**なので、ローカルで通ったマイグレーションがそのまま上位環境に流れる。
- ローカルを作り直したいときは `docker compose down -v` で破棄 →`up -d`→`pnpm db:migrate` で最新まで再適用。
- `pnpm db:generate` / `db:migrate` などのスクリプトと `drizzle.config.ts` は drizzle 導入時に用意する（本ドキュメント時点では未実装）。

## 環境モデル（決定：develop=staging / main=本番）

Neon のブランチで staging と本番の2 DB を持つ（ブランチは scale-to-zero でほぼ無料）。

```
PR 作成/更新 ─► [check]   drizzle-kit のドリフト検査（schema.ts と生成済み migration の不整合を検知）
develop merge ─► [migrate] Neon staging ブランチへ drizzle-kit migrate
main merge ───► [migrate] Neon 本番へ drizzle-kit migrate（Environment: production で保護）
```

## GitHub Actions

- ワークフロー配置: `.github/workflows/`（実装は別タスク）。
- **PR（ドリフト検査）**: `drizzle-kit` でスキーマと生成済みマイグレーションの差分が無いことを確認。差分があれば「migration 未生成」または「手書き SQL とのズレ」として fail させる。DB へは適用しない。
- **develop push（staging 適用）**: `Environment: staging` の `DATABASE_URL_UNPOOLED` で `drizzle-kit migrate`。
- **main push（本番適用）**: `Environment: production` の `DATABASE_URL_UNPOOLED` で `drizzle-kit migrate`。production 環境は保護ルール（必要なら承認）を付ける。
- **同時実行制御**: `concurrency` で同一環境への並行適用を防ぐ。
- Node/pnpm は本リポジトリの nix flake ではなく、Actions の setup-node + pnpm を使う（CI 実行のため）。

## ロールバック方針

- マイグレーションは**前進のみ**。適用済みを巻き戻さない。
- 誤りは**打ち消しマイグレーションを新規追加**して修正する（drizzle 流儀）。
- 破壊的変更（列削除・型変更）は、まず staging で検証し、必要なら「追加 → データ移行 → 旧削除」の多段に分ける。

## updated_at トリガ

`updated_at` の自動更新は DB トリガで担保する。Drizzle の `schema.ts` では表現しづらいため、**トリガ定義は SQL マイグレーションに含める**（drizzle-kit の custom migration もしくは生成 SQL への追記）。

```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

## seed

- users は**初回ログイン時に upsert**するため、手動 seed は不要（[tables.md](./tables.md)）。
- 開発用のサンプルフォルダ/書類が必要なら、`drizzle-kit` とは別の seed スクリプトを用意する（実装時に判断）。
