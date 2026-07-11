# 不変条件・運用ルール

DB 制約だけでは守れない不変条件と、アプリ側で保証するルール。実装は `src/server/*` に集約する（[実装規約](../../.claude/rules/coding-conventions.md)）。

## 論理削除（決定#2）

- 削除は `documents.deleted_at = now()` を立てるだけ。行と S3 実体は残す。
- **参照系はすべて `deleted_at IS NULL` を条件に含める**（一覧・検索・詳細・ダッシュボード・フォルダ内書類）。
- 復元は `deleted_at = NULL` に戻す。
- **S3 実体の掃除**は後日バッチ（Vercel Cron 等）で「`deleted_at` が猶予期間（例: 30日）を過ぎた書類」の S3 オブジェクトを削除し、必要なら行も物理削除する。猶予日数は運用開始時に確定。
- 中間表（`document_folders` / `document_tags`）は論理削除の対象外。書類が論理削除されても紐付けは残す（復元時にそのまま戻せる）。

## フォルダの階層と循環参照

- `parent_id` の自己参照で階層を表現。移動（`parent_id` 変更）時は**循環参照チェック必須** — 移動先が自分自身または自分の子孫でないことを検証してから更新する。
- 名前重複は `UNIQUE(parent_id, name)` + トップ階層の部分ユニークインデックスで防ぐ（[indexes.md](./indexes.md)）。

## 書類の所属フォルダ（1書類=最大1件）

- **1書類が所属できるフォルダは高々1つ**（未分類 = 0件）。`document_folders` は多対多テーブルだが、アプリ層で 1 document あたり最大1行に制約する（`folder_ids` は最大1要素、登録・移動 UI は単一選択）。分類を複数持たせたい場合はタグを使う。
- 書類の「移動」は `PATCH /api/documents/:id { folder_ids }` の全置換で実現（`folder_ids: []` で未分類へ）。

## 未分類（孤立書類）

- フォルダ削除は子フォルダを `ON DELETE CASCADE`、`document_folders` の紐付けも CASCADE で外れるが、**`documents` 本体は消えない**（どこにも属さない＝未分類になる）。
- 「未分類」= `document_folders` に1行も無く、かつ `deleted_at IS NULL` の書類。`GET /api/documents?folder_id=none` 相当で拾えるようにする。

## タグの upsert

- タグは独立作成 API を持たず、書類の作成/更新時に**名前で upsert**（既存は再利用、無ければ作成）して `document_tags` を張る。
- `tags.name` は UNIQUE。大文字小文字・前後空白の正規化方針は実装時に確定（当面はトリム程度）。

## 日付・タイムゾーン

- `created_at` / `updated_at` / `deleted_at` は **`timestamptz`**（UTC で保存）。
- `doc_date` / `expiry_date` は **`date`**（時刻を持たない暦日）。
- 期限リマインドの「N 日以内」判定は **JST 基準**で行う（アプリ側で JST の当日を基準に比較）。

## 監査項目

- `uploaded_by`（追加者）は必須。`updated_by`（最終更新者）は PATCH 時に設定（決定#3）。
- 通知の「妻が○○を追加/更新」は、この2列＋`created_at`/`updated_at` から導く**「最近の追加/更新」ビュー**。イベント履歴（削除や複数回の操作ログ）は持たない。必要になれば `activity` 表を後付けする。
