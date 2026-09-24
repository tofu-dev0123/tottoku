// クライアントストア(TanStack Query)の bootstrap クエリ定義。
// キーはサーバー(レイアウトでのハイドレーション)とクライアントで共有する。
import type { BootstrapData } from "@/server/bootstrap";

export const bootstrapQueryKey = ["bootstrap"] as const;

export async function fetchBootstrap(): Promise<BootstrapData> {
  const res = await fetch("/api/bootstrap");
  if (!res.ok) throw new Error(`bootstrap の取得に失敗しました (${res.status})`);
  return res.json();
}
