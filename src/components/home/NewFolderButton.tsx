"use client";

import { FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// 新規フォルダ作成。POST /api/folders → 成功で router.refresh()。
// parentId は現在のフォルダ(ルートは null)。variant でボタン見た目を切替。
export function NewFolderButton({
  parentId,
  variant = "toolbar",
}: {
  parentId: string | null;
  variant?: "toolbar" | "block";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), parent_id: parentId }),
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      setOpen(false);
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "作成に失敗しました");
    }
  }

  const trigger =
    variant === "toolbar" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold"
      >
        <FolderPlus className="size-4" />
        新規フォルダ
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2.5 text-[13px] font-medium"
      >
        <FolderPlus className="size-4" />
        フォルダ作成
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold">新規フォルダ</h2>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="フォルダ名"
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || !name.trim()}
                className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
