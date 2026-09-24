"use client";

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { bootstrapQueryKey, fetchBootstrap } from "@/lib/bootstrap-query";
import { deleteDocument, deleteFolder } from "@/lib/store-updates";
import type { BootstrapData } from "@/server/bootstrap";
import { usePendingDeletes } from "./pending-deletes";

// 家族の変更を取り込む間隔(表示中のみ)。鮮度要件は「数分の遅れ許容」。
const REFETCH_INTERVAL_MS = 5 * 60_000;

/**
 * クライアントストアの全メタデータ。(filer) レイアウトでハイドレーション済みのため通常は即時に返る。
 * 鮮度: タブへのフォーカス時・オンライン復帰時(最終取得から staleTime=60秒 経過時)と、表示中は5分おきに再取得する。
 * 「元に戻す」猶予中の削除は除外して返す(猶予中に再取得が走っても再表示されない)。
 */
export function useBootstrap(): BootstrapData {
  const queryClient = useQueryClient();
  const data = useSuspenseQuery({
    queryKey: bootstrapQueryKey,
    queryFn: fetchBootstrap,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // 楽観的更新の途中で定期再取得が楽観的状態を上書きしないよう、更新中は止める
    // (更新完了時の再取得で新しいデータが入ると再評価され、定期再取得が再開する)
    refetchInterval: () => (queryClient.isMutating() > 0 ? false : REFETCH_INTERVAL_MS),
    refetchIntervalInBackground: false,
  }).data;
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
