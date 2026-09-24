"use client";

import { FolderPlus } from "lucide-react";
import { useState } from "react";
import { createFolder, hasFolderNameConflict } from "@/lib/store-updates";
import { useBootstrap } from "./use-bootstrap";
import { apiFetch, useStoreMutation } from "./use-store-mutations";

type CreateVars = { id: string; name: string; parentId: string | null };

// 新規フォルダ作成(楽観的更新)。クライアントで id を採番してストアへ即反映し、POST /api/folders を裏で送る。
// 同名チェックはストアで先に行い、ダイアログ内にエラーを出す。parentId は現在のフォルダ(ルートは null)。
export function NewFolderButton({
  parentId,
  variant = "toolbar",
}: {
  parentId: string | null;
  variant?: "toolbar" | "block";
}) {
  const data = useBootstrap();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useStoreMutation<CreateVars>({
    request: (v) =>
      apiFetch(
        "/api/folders",
        { method: "POST", body: JSON.stringify({ id: v.id, name: v.name, parent_id: v.parentId }) },
        "フォルダの作成に失敗しました",
      ),
    apply: createFolder,
  });

  function submit() {
    const next = name.trim();
    if (!next) return;
    if (hasFolderNameConflict(data, parentId, next)) {
      setError("同じ場所に同名のフォルダがあります");
      return;
    }
    create.mutate({ id: crypto.randomUUID(), name: next, parentId });
    setName("");
    setError(null);
    setOpen(false);
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
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold">新規フォルダ</h2>
            <input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="フォルダ名"
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!name.trim()}
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
