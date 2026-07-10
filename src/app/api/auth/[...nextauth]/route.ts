import { handlers } from "@/lib/auth";

// Auth.js のエンドポイント(/api/auth/*)。Google ログイン/コールバック/ログアウト/セッション。
export const { GET, POST } = handlers;
