"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { bootstrapQueryKey, fetchBootstrap } from "@/lib/bootstrap-query";
import type { BootstrapData } from "@/server/bootstrap";

/** クライアントストアの全メタデータ。(filer) レイアウトでハイドレーション済みのため通常は即時に返る。 */
export function useBootstrap(): BootstrapData {
  return useSuspenseQuery({ queryKey: bootstrapQueryKey, queryFn: fetchBootstrap }).data;
}
