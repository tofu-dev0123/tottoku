"use client";

import { useSyncExternalStore } from "react";

// バックグラウンドアップロードのキュー。フォームで「登録」した時点で即座に画面を離れられ、
// ここで presign → S3 へ直 PUT(進捗付き)→ POST /api/documents を順に進める。
// ファイル実体はモジュールに保持するため、(filer) 内の遷移(pushState)をまたいでも処理が続く。
// 失敗した書類はキューに残り、再試行(S3 へ上げ済みなら登録だけやり直す)か破棄を選べる。

export type UploadMeta = {
  title: string;
  docDate: string | null;
  expiryDate: string | null;
  memo: string | null;
  folderId: string | null;
  tags: string[];
};

export type UploadItem = {
  // 登録後の書類 id(クライアント採番)
  id: string;
  fileName: string;
  size: number;
  meta: UploadMeta;
  status: "uploading" | "creating" | "error";
  // S3 への転送進捗(0〜1)
  progress: number;
  error?: string;
};

type Entry = UploadItem & {
  file: File;
  // S3 へ上げ済みならその key(再試行時は PUT を省く)
  s3Key?: string;
  onCreated: () => Promise<unknown>;
};

let entries: Entry[] = [];
let snapshot: UploadItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  // 公開するのは表示用の項目だけ(File などの内部状態は渡さない)
  snapshot = entries.map((e) => ({
    id: e.id,
    fileName: e.fileName,
    size: e.size,
    meta: e.meta,
    status: e.status,
    progress: e.progress,
    error: e.error,
  }));
  for (const l of listeners) l();
}

function patch(id: string, partial: Partial<Entry>) {
  entries = entries.map((e) => (e.id === id ? { ...e, ...partial } : e));
  emit();
}

function remove(id: string) {
  entries = entries.filter((e) => e.id !== id);
  emit();
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.error ?? fallback;
}

// 署名付き URL へ PUT。fetch では送信進捗が取れないため XMLHttpRequest を使う。
function putWithProgress(url: string, file: File, onProgress: (ratio: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error()));
    xhr.onerror = () => reject(new Error());
    xhr.send(file);
  });
}

async function run(id: string) {
  const entry = entries.find((e) => e.id === id);
  if (!entry) return;

  try {
    let s3Key = entry.s3Key;
    if (!s3Key) {
      patch(id, { status: "uploading", progress: 0, error: undefined });
      const presign = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          files: [{ filename: entry.file.name, mime_type: entry.file.type, size: entry.file.size }],
        }),
      });
      if (!presign.ok)
        throw new Error(await readError(presign, "アップロードURLの取得に失敗しました"));
      const { results } = (await presign.json()) as {
        results: { upload_url: string; s3_key: string }[];
      };
      try {
        await putWithProgress(results[0].upload_url, entry.file, (p) => patch(id, { progress: p }));
      } catch {
        throw new Error("ファイルのアップロードに失敗しました");
      }
      s3Key = results[0].s3_key;
      patch(id, { s3Key, progress: 1 });
    }

    patch(id, { status: "creating", error: undefined });
    const m = entry.meta;
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        documents: [
          {
            id,
            title: m.title,
            s3_key: s3Key,
            mime_type: entry.file.type,
            doc_date: m.docDate,
            expiry_date: m.expiryDate,
            memo: m.memo,
            folder_ids: m.folderId ? [m.folderId] : [],
            tags: m.tags,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(await readError(res, "登録に失敗しました"));
    const { results } = (await res.json()) as {
      results: { status: "ok" | "error"; error?: string }[];
    };
    if (results[0]?.status !== "ok") throw new Error(results[0]?.error ?? "登録に失敗しました");

    // ストアの再取得で本物の書類が一覧に出てからキューから外す(行の入れ替わりを途切れさせない)
    await entry.onCreated();
    remove(id);
  } catch (e) {
    patch(id, {
      status: "error",
      error: e instanceof Error && e.message ? e.message : "登録に失敗しました",
    });
  }
}

if (typeof window !== "undefined") {
  // 転送・登録中にタブを閉じる/リロードしようとしたら警告する(SPA 内の遷移では処理は続く)
  window.addEventListener("beforeunload", (e) => {
    if (entries.some((x) => x.status !== "error")) e.preventDefault();
  });
}

/** アップロードを開始する。onCreated は登録成功後のストア再取得。 */
export function enqueueUploads(
  inputs: { id: string; file: File; meta: UploadMeta }[],
  onCreated: () => Promise<unknown>,
) {
  const added: Entry[] = inputs.map((i) => ({
    id: i.id,
    file: i.file,
    fileName: i.file.name,
    size: i.file.size,
    meta: i.meta,
    status: "uploading",
    progress: 0,
    onCreated,
  }));
  entries = [...entries, ...added];
  emit();
  for (const e of added) void run(e.id);
}

/** 失敗した書類を再試行する(S3 へ上げ済みなら登録だけやり直す)。 */
export function retryUpload(id: string) {
  const entry = entries.find((e) => e.id === id);
  if (entry?.status === "error") void run(id);
}

/** 失敗した書類をキューから外す。 */
export function discardUpload(id: string) {
  const entry = entries.find((e) => e.id === id);
  if (entry?.status === "error") remove(id);
}

const empty: UploadItem[] = [];

export function useUploadQueue(): UploadItem[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
    () => empty,
  );
}
