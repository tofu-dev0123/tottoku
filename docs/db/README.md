# DB 設計

トットク（家庭書類管理）の DB 設計ドキュメント。内容ごとに分割している。

## 目次

| ファイル | 内容 |
|---|---|
| [er-diagram.md](./er-diagram.md) | ER 図（テーブル間の関係） |
| [tables.md](./tables.md) | テーブル定義（全カラム・制約） |
| [indexes.md](./indexes.md) | インデックス戦略と根拠 |
| [invariants.md](./invariants.md) | 不変条件・運用ルール（論理削除 / 循環参照 / 未分類 / タグ upsert / 日付） |
| [migrations.md](./migrations.md) | Neon 接続・drizzle-kit・GitHub Actions によるマイグレーション運用 |

## 設計方針（要約）

- **ファイル実体は S3 にフラット保存**し、フォルダ・分類はすべてメタデータ（DB）で表現する。
- **フォルダは物理ディレクトリではなく「階層を持てるラベル」**。1 書類を複数フォルダに同時所属させられる（`document_folders` が実体）。
- ユーザー入力は最小限（`title` 必須 / `doc_date` / `expiry_date` / `memo`）。残りはシステム項目。

上位の仕様は [`../data-model-and-api.md`](../data-model-and-api.md)（API 中心）を参照。DB の詳細は本ディレクトリを正とする。

## 決定事項ログ

| # | 決定 | 内容 |
|---|---|---|
| 1 | スキーマの正 | **`src/db/schema.ts`（Drizzle）を唯一の正**とする。DDL は drizzle-kit 生成の `drizzle/` を経て適用（旧 `schema.sql` は廃止）。 |
| 2 | 削除ポリシー | **論理削除**。`documents.deleted_at` を持ち、削除は非表示化のみ。S3 実体は後日バッチで掃除。 |
| 3 | 更新者・履歴 | **`documents.updated_by` のみ**を持つ（最新の更新者）。イベント履歴の `activity` 表は defer。通知は「最近の追加/更新」ビューで支える。 |
| 4 | DB 種別 | サーバーレス PostgreSQL = **Neon**（scale-to-zero、Drizzle/Vercel 相性）。 |

## 対象フェーズ

- 本ドキュメントは**第1フェーズ**（`title` 部分一致検索まで）を対象とする。
- 第2フェーズ（OCR + 全文検索、`ocr_text` / `search_tsv`）は [migrations.md](./migrations.md) と [indexes.md](./indexes.md) に将来対応として記す。
