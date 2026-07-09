# 認証 (auth)

Auth.js の Google ログインを使う。`email` が allowlist（家族2名）に含まれる場合のみ許可し、初回ログイン時に `users` を upsert する（パスワードは持たない）。

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/auth/session` | 現在のログイン状態と user 情報 |
| — | `/api/auth/*` | Auth.js が提供（Google ログイン / コールバック / ログアウト） |

## GET /api/auth/session

未ログインなら `user` は null。

```json
{
  "user": {
    "id": "9f3c...",
    "email": "t@example.com",
    "displayName": "夫"
  }
}
```

- allowlist に無い email で Google 認証された場合はログインを拒否する（`users` に登録しない）。
- 以降の全 API は、このセッションの email が allowlist に含まれることを検証する（含まれなければ 401）。

## 実装方針

- **Auth.js v5**（`src/lib/auth.ts`）。プロバイダは Google のみ。
- **セッションは JWT・アダプタなし**。`maxAge` 30日（sliding）で永続ログイン。リフレッシュトークンは自作しない（Cookie の JWT を Auth.js がローリング更新）。Google API は叩かないので Google の refresh token も保存しない。
- **allowlist 判定**は純関数 `src/lib/allowlist.ts`（`AUTH_ALLOWED_EMAILS` を `src/lib/env.ts` で検証）。`signIn` コールバックで非許可を拒否。
- **users upsert**: 初回サインイン時に `jwt` コールバックで `users` を作成し、内部 `id`/`displayName` を JWT→セッションへ載せる（`session.user.id`）。`display_name` は初回のみ Google 名から設定（以降は上書きしない）。
- **保護**: `src/middleware.ts` が全ルートを認証必須にし、未ログインは API→401 / ページ→`/login`。Route Handler では `requireUser()`（`src/lib/session.ts`）で 401 を返す。
