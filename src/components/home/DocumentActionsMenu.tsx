"use client";

import { FileText, MoreVertical, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

// 書類行のケバブメニュー(詳細/削除)。FolderActionsMenu と同方針:
// 自前モーダル + fetch + router.refresh()、トーストは使わずインラインでエラー表示。
export function DocumentActionsMenu({ doc }: { doc: { id: string; title: string } }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    if (busy) return;
    setConfirmDelete(false);
    setError(null);
  }

  async function submitDelete() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) {
      setBusy(false);
      setConfirmDelete(false);
      router.refresh();
    } else {
      setBusy(false);
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "削除に失敗しました");
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="書類操作"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex size-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200/70 hover:text-gray-700"
      >
        <MoreVertical className="size-4" />
      </button>

      {menuOpen && (
        <>
          {/* 外側クリックで閉じる透明オーバーレイ */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-full right-0 z-50 mt-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg">
            <Link
              href={`/documents/${doc.id}`}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
            >
              <FileText className="size-4 text-gray-500" />
              詳細
            </Link>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setError(null);
                setConfirmDelete(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" />
              削除
            </button>
          </div>
        </>
      )}

      {confirmDelete && (
        <Modal onClose={close}>
          <h2 className="text-sm font-semibold">「{doc.title}」を削除しますか？</h2>
          <p className="mt-2 text-xs text-gray-500">
            削除済みの書類は一覧・検索に表示されなくなります。
          </p>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-500 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={submitDelete}
              disabled={busy}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              削除する
            </button>
          </div>
        </Modal>
      )}
    </span>
  );
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 text-left font-normal text-gray-900"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
