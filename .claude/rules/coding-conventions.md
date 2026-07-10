# 実装規約

## TypeScript

- strict を維持し **`any` 禁止**。
- 型は **Drizzle の推論**と **Zod の `z.infer`** から導出し、同じ形を二重定義しない。

## Route Handler 標準フロー（全 API 共通）

1. **認証必須** — セッションを取得し、email が allowlist（家族のメール）に含まれるか検証。未認証・非許可は **401**。
2. **入力検証** — body / query を **Zod で parse**。不正は **400**、内容を JSON で返す。
3. **データアクセス** — `src/server/<domain>` の関数を呼ぶ。**Route Handler に SQL / Drizzle クエリを直書きしない。**
4. **応答** — JSON で返す。**日時は ISO 8601 文字列**。エラーは **`{ error: string }`** 形式で統一。

## DB（Drizzle）

- アクセスは **Drizzle のみ**。生 SQL の直書きは原則しない。
- スキーマの正は **`src/db/schema.ts`**。変更は schema.ts を編集し **drizzle-kit** で migration を生成する（詳細は `docs/db/migrations.md`）。

## セキュリティ（設計書 §3 準拠・厳守）

- S3 の**署名付き URL 発行はサーバー側のみ**。IAM 認証情報をクライアントへ渡さない。
- **ファイル実体は API を経由させず client↔S3 直結**（アップロードは presign → PUT、ダウンロードは短命の GET URL）。
- 秘密情報は **`env.ts` 経由の環境変数のみ**。`.env*` はコミットしない（`.env.example` のみ可）。

## ドメイン固有の不変条件（設計書 §1・§2.4）

- **フォルダ移動**（`parent_id` 変更）時は**循環参照チェック必須**（移動先が自分の子孫でないこと）。
- フォルダ削除でどのフォルダにも属さなくなった書類を **「未分類」** として拾えるようにする（`document_folders` に1行も無い書類）。
- 書類⇄フォルダ、書類⇄タグは多対多。タグは書類の作成/更新時に名前で **upsert** する。

## 完了前チェック

- `pnpm lint` と `pnpm format` を通す。
- 作業は **nix flake dev shell 内**（`nix develop` / direnv）で行い、パッケージ操作は **pnpm** を使う。
