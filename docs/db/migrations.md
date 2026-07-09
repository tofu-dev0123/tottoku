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
