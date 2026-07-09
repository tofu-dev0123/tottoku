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
