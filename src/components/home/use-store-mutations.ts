"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useToast } from "@/components/Toaster";
import { bootstrapQueryKey } from "@/lib/bootstrap-query";
import type { BootstrapData } from "@/server/bootstrap";
import { cancelDelete, type PendingDelete, scheduleDelete } from "./pending-deletes";

const storeMutationKey = ["store-mutation"] as const;

// 「元に戻す」を押せる猶予(この間は DELETE を送らない)
export const UNDO_WINDOW_MS = 5000;

/** fetch して失敗なら { error } の文言で throw する。 */
export async function apiFetch(url: string, init: RequestInit, fallback: string): Promise<void> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? fallback);
  }
}

/**
 * 楽観的更新の共通フック。実行と同時にストアへ apply を反映し、失敗したら元に戻してトーストで通知する。
 * 完了後(最後の更新が終わったとき)に bootstrap を再取得してサーバーの正に揃える。
 */
export function useStoreMutation<V>({
  request,
  apply,
}: {
  request: (vars: V) => Promise<void>;
  apply: (data: BootstrapData, vars: V) => BootstrapData;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationKey: storeMutationKey,
    mutationFn: request,
    onMutate: async (vars: V) => {
      // 進行中の再取得が楽観的更新を上書きしないよう止める
      await queryClient.cancelQueries({ queryKey: bootstrapQueryKey });
      const prev = queryClient.getQueryData<BootstrapData>(bootstrapQueryKey);
      if (prev) queryClient.setQueryData(bootstrapQueryKey, apply(prev, vars));
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(bootstrapQueryKey, ctx.prev);
      toast({ tone: "error", message: e.message });
    },
    onSettled: () => {
      // 連続操作中は途中の再取得で楽観的状態がちらつかないよう、最後の1件の完了時だけ取り直す
      if (queryClient.isMutating({ mutationKey: storeMutationKey }) === 1) {
        return queryClient.invalidateQueries({ queryKey: bootstrapQueryKey });
      }
    },
  });
}

/** 「元に戻す」付き削除。画面からは即座に消え、猶予後に DELETE を送る。 */
export function useUndoableDelete() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useCallback(
    (target: { kind: PendingDelete["kind"]; id: string; label: string }) => {
      const key = scheduleDelete({
        kind: target.kind,
        id: target.id,
        delayMs: UNDO_WINDOW_MS,
        onCommitted: () => queryClient.invalidateQueries({ queryKey: bootstrapQueryKey }),
        onFailed: (message) => toast({ tone: "error", message }),
      });
      toast({
        message: `「${target.label}」を削除しました`,
        action: { label: "元に戻す", onClick: () => cancelDelete(key) },
        durationMs: UNDO_WINDOW_MS,
      });
    },
    [queryClient, toast],
  );
}
