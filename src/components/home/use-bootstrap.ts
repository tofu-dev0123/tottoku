"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { bootstrapQueryKey, fetchBootstrap } from "@/lib/bootstrap-query";
import { deleteDocument, deleteFolder } from "@/lib/store-updates";
import type { BootstrapData } from "@/server/bootstrap";
import { usePendingDeletes } from "./pending-deletes";

/**
 * クライアントストアの全メタデータ。(filer) レイアウトでハイドレーション済みのため通常は即時に返る。
 * 「元に戻す」猶予中の削除は除外して返す(猶予中に再取得が走っても再表示されない)。
 */
export function useBootstrap(): BootstrapData {
  const data = useSuspenseQuery({ queryKey: bootstrapQueryKey, queryFn: fetchBootstrap }).data;
  const pending = usePendingDeletes();
  return useMemo(
    () =>
      pending.reduce(
        (d, p) => (p.kind === "folder" ? deleteFolder(d, p.id) : deleteDocument(d, p.id)),
        data,
      ),
    [data, pending],
  );
}
