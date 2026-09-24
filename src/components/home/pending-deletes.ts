"use client";

import { useSyncExternalStore } from "react";

// 「元に戻す」付き削除の保留キュー。削除は画面から即座に消し(useBootstrap が保留分を除外して返す)、
// 猶予時間が過ぎてから DELETE を送る。取り消されたら送らないため、サーバー側に復元 API は要らない。
// タブを閉じる/離れるときは pagehide で保留分を keepalive 付きで即時送信する。

export type PendingDelete = { key: string; kind: "folder" | "document"; id: string };

type Entry = PendingDelete & {
  timer: ReturnType<typeof setTimeout>;
  onCommitted: () => Promise<unknown>;
  onFailed: (message: string) => void;
  // 送信済み(タイマーと pagehide の二重送信・送信後の取り消しを防ぐ)
  committing: boolean;
};

let entries: Entry[] = [];
let snapshot: PendingDelete[] = [];
const listeners = new Set<() => void>();

function emit() {
  snapshot = entries.map(({ key, kind, id }) => ({ key, kind, id }));
  for (const l of listeners) l();
}

function remove(key: string) {
  entries = entries.filter((e) => e.key !== key);
  emit();
}

async function commit(entry: Entry) {
  if (entry.committing) return;
  entry.committing = true;
  clearTimeout(entry.timer);
  const url = entry.kind === "folder" ? `/api/folders/${entry.id}` : `/api/documents/${entry.id}`;
  try {
    const res = await fetch(url, { method: "DELETE", keepalive: true });
    // 既に消えている(家族が先に削除した)場合も、結果は同じなので成功扱い
    if (!res.ok && res.status !== 404) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "削除に失敗しました");
    }
    // 再取得でサーバー側も消えたデータに揃ってから保留を外す(一瞬の再表示を防ぐ)
    await entry.onCommitted();
    remove(entry.key);
  } catch (e) {
    remove(entry.key);
    entry.onFailed(e instanceof Error ? e.message : "削除に失敗しました");
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    for (const e of entries) void commit(e);
  });
}

let seq = 0;

/** 削除を予約する。戻り値のキーで cancelDelete すると取り消せる。 */
export function scheduleDelete(input: {
  kind: PendingDelete["kind"];
  id: string;
  delayMs: number;
  onCommitted: () => Promise<unknown>;
  onFailed: (message: string) => void;
}): string {
  const key = `${input.kind}:${input.id}:${++seq}`;
  const entry: Entry = {
    key,
    kind: input.kind,
    id: input.id,
    onCommitted: input.onCommitted,
    onFailed: input.onFailed,
    committing: false,
    timer: setTimeout(() => void commit(entry), input.delayMs),
  };
  entries = [...entries, entry];
  emit();
  return key;
}

/** 予約した削除を取り消す(送信前のみ有効)。 */
export function cancelDelete(key: string) {
  const entry = entries.find((e) => e.key === key);
  if (!entry || entry.committing) return;
  clearTimeout(entry.timer);
  remove(key);
}

const empty: PendingDelete[] = [];

export function usePendingDeletes(): PendingDelete[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
    () => empty,
  );
}
