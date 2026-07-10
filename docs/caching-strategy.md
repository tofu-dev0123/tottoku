# キャッシュ戦略（設計書）

トットクの画面遷移ごとに DB（Neon）へ再クエリしている状態を改善するためのキャッシュ設計。
本書は **アプリ全体規模** でのキャッシュ方針を定め、実装済みの層と、今後着手する層（Cache Components）の設計を記す。

> 実装状況（2026-07-10 時点）
> - ✅ 層② クライアント Router Cache（`staleTimes`）… `next.config.ts` に導入済み
> - 🔜 層③ Cache Components（`use cache` + タグ無効化）… 本書が設計。別 PR で実装予定
> - ⏸ 層① リクエストメモ化（React `cache()`）… 現状は重複が無く効果なし。③で導入判断

---

## 1. 前提となるデータ特性（設計判断の根拠）

| 特性 | 内容 | 設計への含意 |
| --- | --- | --- |
| 共有データ | 読み取り関数は user で絞らず、家族2名が同一データを見る | キャッシュは **グローバル**（ユーザー別キー不要） |
| 読み多い・書き少ない | 閲覧が主、作成/更新/削除は稀 | **積極キャッシュ + タグ無効化** が最適。過剰無効化のコストも小さい |
| 変更経路が集約 | 変更は `src/server/*` の mutation 関数経由のみ | 無効化を **一箇所** に差せる |
| 真のコスト | Neon のレイテンシ/コールドスタート | **永続サーバーキャッシュ** で家族全員ぶんの往復を隠せる |
| 単一家庭（確定） | マルチテナント化しない | テナントキー不要（将来変わればキー設計の見直しが必要） |
| 鮮度要件 | 家族の変更は **数十秒〜数分の遅れ許容** | 長め `cacheLife` + 変更時タグ無効化で十分 |

---

## 2. キャッシュ階層モデル

| 層 | 範囲 | 効く場面 | 無効化 | 採否 |
| --- | --- | --- | --- | --- |
| ① React `cache()` | 1リクエスト内 | 同一レンダー内の重複クエリ除去 | 自動 | ⏸ 現状重複なし。③で判断 |
| ② `staleTimes`（Client Router Cache） | ブラウザ・数十秒 | 再遷移・戻る/進む | `router.refresh()` が全体破棄 | ✅ 導入済み |
| ③ Cache Components（`use cache`+tag） | 全ユーザー横断・永続 | 初回/別ユーザー/コールドスタート | `revalidateTag` | 🔜 本設計 |

### 層②の設定（導入済み）

```ts
// next.config.ts
experimental: { staleTimes: { dynamic: 60, static: 300 } }
```

- Link は既定 prefetch のため dynamic バケット（60s 再利用）。
- 変更後は各ハンドラの `router.refresh()` が Router Cache を破棄 → **自分の編集は即時反映**。
- 家族の変更は最大 60s 古く見えるが、鮮度方針（数分許容）の範囲内。

### 層①の現状判断

各ページは **データを1回取得し mobile/desktop 両コンポーネントへ props で配布** する作りで、
`allFolderRows()` も `auth()`（next-auth 内部でメモ化済み）も1リクエストにつき実質1回しか呼ばれない。
→ 現時点で `cache()` を入れても除去対象が無い。**③で read をコンポーネント粒度に分割した場合に初めて有効**になるため、そのタイミングで導入する。

---

## 3. 層③ Cache Components 詳細設計

### 3.1 有効化と影響

```ts
// next.config.ts
const nextConfig: NextConfig = { cacheComponents: true };
```

- `cacheComponents: true` は **全ルートを PPR 化** する。
- 各ページは `auth()`（cookie 参照＝動的）を呼ぶため、**auth ゲートは動的**のまま。
  キャッシュ対象の read は **Suspense で包んだ「穴」** として差し込む。
- 既存の `loading.tsx` / スケルトン部品（`FilerSkeleton` / `DetailSkeleton`）を **Suspense fallback に再利用**できる（層③は既存資産と親和的）。

### 3.2 read 関数のキャッシュ方針

`'use cache'` + `cacheTag(...)` + `cacheLife(...)` を付ける。**日付依存の関数は `today` を引数で受け、キャッシュキー化**する（日が変わると自動でキーが変わり、期限固定バグを防ぐ）。

| 関数 (`src/server/*`) | タグ | 日付依存 | cacheLife | 備考 |
| --- | --- | --- | --- | --- |
| `listFolders(parentId)` | `folders` | 否 | hours | 直下フォルダ + 件数 |
| `getFolderTree()` / `getFolderOptions()` | `folders` | 否 | hours | 構造のみ |
| `getFolderDetail(id)` | `folder:{id}`, `folders` | 否 | hours | 子 + パンくず + 直下書類 |
| `getFilerDocuments(folderId)` | `documents`, `folder:{folderId}` | 否 | hours | 一覧（createdAt 順） |
| `getDocumentDetail(id)` | `document:{id}` | 否 | hours | 詳細 |
| `getFilerCounts()` | `counts` | **要** | minutes | expiringSoon が today 依存 → today をキー化 |
| `getDocumentList(filter)` | `documents` | 条件付き | minutes/hours | `expiringWithin` 指定時のみ today 依存 → today をキー化 |
| `getExpiringDocuments(limit)` | `documents` | **要** | minutes | today をキー化 |
| `getFilerData(folderId)` | — | — | **キャッシュしない** | 上記 leaf を束ねる薄い composer。leaf 側でキャッシュ |
| `getFolderDeletionImpact(id)` | — | — | キャッシュしない | 確認ダイアログ用の一時 read |
| `getDocumentForDownload(id)` | — | — | **絶対キャッシュ禁止** | 署名付き URL。短命・都度発行 |

### 3.3 タグ分類

- `documents` … 書類一覧レベル（どの一覧にも影響する変更）
- `document:{id}` … 書類1件の詳細
- `folders` … フォルダ構造（ツリー/一覧/options/件数）
- `folder:{id}` … 特定フォルダのビュー（子 + 直下書類 + パンくず）
- `counts` … 集計（total / expiringSoon / unclassified）

### 3.4 無効化マップ（推奨: 粗粒度）

書き込みが稀なため、**過剰無効化は実害が小さい**。バグを避けるため既定は粗粒度とし、必要なら `document:{id}`/`folder:{id}` を足して最適化する。

| mutation | revalidateTag |
| --- | --- |
| `createDocument` | `documents`, `counts`, `folders`（＋紐付く `folder:{id}`） |
| `updateDocument` | `document:{id}`, `documents`, `counts`, `folders` |
| `softDeleteDocument` | `document:{id}`, `documents`, `counts`, `folders` |
| `createFolder` | `folders`（＋`folder:{parent}`） |
| `updateFolder`（改名/移動） | `folders`, `documents`（＊）, `folder:{id/旧親/新親}` |
| `deleteFolder` | `folders`, `documents`, `counts`, `folder:{id}` |

> **＊重要な相互依存**: `attachFolderNames` は **フォルダ名を書類一覧のキャッシュに埋め込む**。
> よってフォルダ改名は `documents` も無効化しないと、一覧に旧フォルダ名が残る。
> この結合を嫌うなら、一覧では名前を埋めず id のみ返し表示側で解決する設計に変える手もある（別途検討）。

`revalidateTag` は各 Route Handler（`src/app/api/**/route.ts`）で mutation 関数の呼び出し後に実行する。
（同一リクエスト内で即時反映が要る箇所のみ `updateTag` を使う。基本は `revalidateTag` の stale-while-revalidate で十分。）

### 3.5 落とし穴と対処

1. **日付固定**: `use cache` 内で `Date` は凍結される。日付依存 read は `today` を引数化（§3.2）。
2. **auth / cookies**: `use cache` 内で `cookies()`/`headers()`/`searchParams` は使えない。auth はページ上位（動的）で行い、read へは値を引数で渡す（read は user 非依存なので実質不要）。
3. **検索**: `q` を引数化すればキャッシュ可能だが高カーディナリティ。**検索はキャッシュしないか短命**に。
4. **presign 禁止**: `getDocumentForDownload` は絶対にキャッシュしない。
5. **experimental フラグ**: `cacheComponents`/`staleTimes` は experimental。Next のマイナー更新時に挙動差分を確認する。

### 3.6 ページ再構成（PPR）

例: ホーム（`src/app/page.tsx`）
1. `auth()` を上位で実行（動的ゲート）。
2. キャッシュ対象データ（filer / expiring）を **子コンポーネントに分離**し `use cache` 化。
3. それらを `<Suspense fallback={<FilerSkeleton/>}>` で包む。
4. 既存の `loading.tsx` はルート遷移の即時表示、Suspense fallback は各データ穴のストリーミングに使う。

---

## 4. 段階的移行手順（③実装時）

1. `cacheComponents: true` を有効化。
2. 日付依存 read を `today` 引数化（`getFilerCounts` / `getDocumentList` / `getExpiringDocuments`）。呼び出し側で `todayInJST()` を渡す。
3. `src/server/cache-tags.ts` を作成（`documents()` / `document(id)` / `folders()` / `folder(id)` / `counts()`）。
4. §3.2 の read に `'use cache'` + `cacheTag` + `cacheLife` を付与。
5. §3.4 に従い各 Route Handler に `revalidateTag` を追加。
6. ページを §3.6 の形へ再構成（auth ゲート + Suspense + cached read）。
7. 検証（§5）。

---

## 5. 検証

- `pnpm build` … PPR 化でビルドが通ること（静的/動的の判定を dev のオーバーレイで確認）。
- 変更→鮮度: 書類作成/更新/削除・フォルダ改名/移動/削除の各操作後、関連画面が **正しく更新**されること（特にフォルダ改名で一覧の名前が変わること＝§3.4＊）。
- キャッシュ効: 同一画面へ再訪/別セッションから初回訪問で **DB クエリが発生しない**こと（Neon のログ or サーバーログで確認）。
- presign: ダウンロード URL が毎回新規発行され、キャッシュされないこと。

---

## 6. 決定事項（本設計の前提）

- 鮮度: **数十秒〜数分の遅延を許容**（強めキャッシュ + 変更時タグ無効化）。
- テナント: **単一家庭のまま**（グローバルタグ。将来マルチテナント化する場合はテナントIDをタグ/キーに導入）。
- 進め方: **層② を先行導入（済）**、層③ は本設計に基づき別 PR。層① は③で判断。
