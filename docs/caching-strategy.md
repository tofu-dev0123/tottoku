# データ取得・キャッシュ戦略（設計書）

トットクの画面描画・データ取得・キャッシュの全体方針。#37 で「画面遷移ごとに DB（Neon）へ再クエリし、ローディングが入る」状態を解消するため、
**SPA 寄りの構成（クライアントストア + shallow routing）** に移行した。本書はその設計を記す。

> 以前の本書は Next の Cache Components（`use cache` + タグ無効化）でサーバー側キャッシュを強化する設計だったが、
> 動的ルートは遷移ごとにサーバー往復が残る（`prefetching.md`）ため採用せず、クライアントストア方式に切り替えた。

---

## 1. 前提となるデータ特性（設計判断の根拠）

| 特性 | 内容 | 設計への含意 |
| --- | --- | --- |
| 共有データ | 家族2名が同一データを見る（読み取りは user で絞らない） | ストアは1種類（ユーザー別キー不要） |
| データ量が小さい | メタデータは数百件規模 | **全件をクライアントへ一括で載せられる** |
| 読み多い・書き少ない | 閲覧が主、作成/更新/削除は稀 | 変更後は全件再取得で十分（細かい無効化は不要） |
| ログイン必須・SEO 不要 | 公開しない | SSR/RSC の利点が薄く、クライアント描画で問題ない |
| 鮮度要件 | 家族の変更は **数分の遅れ許容** | フォーカス時・定期の再取得で十分 |

---

## 2. 全体構成

```
(filer) レイアウト（Server）
  ├─ auth() + getBootstrapData() … 全メタデータを1回だけ取得
  └─ HydrationBoundary … TanStack Query の ["bootstrap"] へハイドレーション
       └─ FilerApp（Client）… usePathname / useSearchParams でルートを判定し、ストアから描画
            ├─ ホーム / フォルダ / 書類一覧 / 検索 / 書類詳細 / 書類追加
            ├─ AppLink / useAppRouter … (filer) 内の遷移は history.pushState（サーバー往復なし）
            └─ 更新 … 楽観的更新 → API → 完了後に ["bootstrap"] を再取得
```

| 層 | 役割 | 実装 |
| --- | --- | --- |
| 一括取得 | フォルダ・書類・タグ・利用者の全メタデータ | `GET /api/bootstrap`（`src/server/bootstrap.ts`、[API](./api/bootstrap.md)） |
| 初回表示 | サーバーで取得してハイドレーション（初回もスピナーなし） | `src/app/(filer)/layout.tsx` |
| ストア | クライアントの単一キャッシュ | TanStack Query `["bootstrap"]`（`src/lib/bootstrap-query.ts`・`use-bootstrap.ts`） |
| 派生 | 一覧・件数・期限・未分類・詳細・パンくずを計算 | 純関数 `src/lib/filer-derive.ts` |
| 遷移 | (filer) 内はクライアントのみで切り替え | `AppLink` / `useAppRouter`・`client-routes.ts` |
| 更新 | 楽観的更新と失敗時ロールバック | `use-store-mutations.ts`・純関数 `src/lib/store-updates.ts` |

- `src/app/(filer)/**/page.tsx` は **入口のみ（`null` を返す）**。直接アクセス・リロード・ブックマーク用にルートを残し、描画は `FilerApp` が行う。
- (filer) 外のページ（通知・設定・ログイン・LP）は従来どおりサーバー描画。

---

## 3. 遷移（shallow routing）

- (filer) 内のクライアント描画ルート（`/`・`/folders`・`/folders/:id`・`/documents`・`/documents/:id`・`/documents/new`・`/search`）への遷移は `history.pushState`。Next 16 は pushState を Router と統合しており、`usePathname` / `useSearchParams` が追従する。
- それ以外（通知・設定など）への遷移や、FilerApp の外からの遷移は通常の `Link` / `router.push`（`AppLink` が自動で振り分ける）。
- 戻る/進む・リロード・URL 直接入力はそのまま動く（初回はレイアウトでハイドレーション）。
- 遷移ごとに画面を再マウント（key = pathname + query）してスクロール位置・編集状態をリセットする。

---

## 4. 更新（楽観的更新）

| 操作 | 方式 |
| --- | --- |
| フォルダ作成・名前変更・移動、書類の移動・保存 | `useStoreMutation`: 即時にストアへ反映 → API → 失敗時はロールバック + エラートースト |
| フォルダ・書類の削除 | `useUndoableDelete`: 即時に非表示 → 5秒の「元に戻す」猶予後に DELETE（`pending-deletes.ts`） |
| 書類アップロード | `upload-queue.ts`: 即時に保存先へ遷移し「アップロード中」行を表示 → presign → S3 PUT → 登録 |

- 同一階層の同名・循環参照・移動先の同名はストアで先に検証し、ダイアログ内でエラー表示する（サーバー側の検証も維持）。
- 作成系（フォルダ・書類）は **クライアントで UUID を採番**して API に渡す（仮 id → 本 id の付け替えを不要にする）。
- 完了後（連続操作中は最後の1件の完了時）に `["bootstrap"]` を再取得し、サーバーの正に揃える。
- 削除の猶予中は `useBootstrap` が保留分を除外して返すため、途中の再取得でも再表示されない。タブを閉じるときは `pagehide` で keepalive 送信する。

---

## 5. 鮮度

| きっかけ | 挙動 |
| --- | --- |
| タブへのフォーカス / オンライン復帰 | 最終取得から `staleTime`（60秒）経過していれば再取得 |
| 表示中 | 5分おきに再取得（バックグラウンドタブでは止める。楽観的更新の途中も止める） |
| 自分の変更 | 楽観的更新で即時反映 + 完了後に再取得 |
| `router.refresh()` | (filer) レイアウトが再実行され、新しいデータが再ハイドレーションされる |

家族の変更は最大で数分遅れて見えるが、鮮度方針（数分許容）の範囲内。

### Router Cache（`staleTimes`）

`next.config.ts` の `experimental.staleTimes`（dynamic 60s / static 300s）は、(filer) 外のページ（通知・設定）との行き来や、外から (filer) へ入るときの RSC の再利用に効く。(filer) 内の遷移は pushState のため関与しない。

---

## 6. 注意点

- **署名付き URL はストアに載せない**。ダウンロード・アップロードの URL は都度 API で発行する（`s3_key` も bootstrap に含めない）。
- **日付依存の派生**（期限が近い・件数）は描画時の `todayInJST()` で計算するため、日付が変わっても次の描画で追従する。
- **データ量の上限**: 全件一括のため、書類が数千件規模になったら一括取得の見直し（ページングや差分取得）が必要。
- **ロールバックの粒度**: 失敗時は操作前スナップショットへ戻すため、同時に複数の操作が失敗した場合は直後の再取得でサーバーの状態に揃う。
- S3 の孤児オブジェクト（アップロード後に登録されなかったファイル）の掃除は #43 で対応する。
