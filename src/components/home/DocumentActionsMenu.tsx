"use client";

import { FileText, FolderInput, MoreVertical, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { updateDocument } from "@/lib/store-updates";
import { AppLink } from "./AppLink";
import { useFilerUser } from "./FilerUserProvider";
import { MoveDialog } from "./MoveDialog";
import { apiFetch, useStoreMutation, useUndoableDelete } from "./use-store-mutations";

type MoveVars = { id: string; folderId: string | null };

// 書類行のケバブメニュー(詳細/移動/削除)。FolderActionsMenu と同方針:
// 移動は楽観的更新で即反映(失敗時はトーストで通知して元に戻す)、削除は「元に戻す」付き。
export function DocumentActionsMenu({ doc }: { doc: { id: string; title: string } }) {
  const user = useFilerUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moving, setMoving] = useState(false);

  // 移動先フォルダへ folder_ids を全置換(1書類=1フォルダ)。未分類は空配列。
  const move = useStoreMutation<MoveVars>({
    request: (v) =>
      apiFetch(
        `/api/documents/${v.id}`,
        { method: "PATCH", body: JSON.stringify({ folder_ids: v.folderId ? [v.folderId] : [] }) },
        "移動に失敗しました",
      ),
    apply: (d, v) =>
      updateDocument(
        d,
        v.id,
        { folderId: v.folderId },
        { userId: user.id, now: new Date().toISOString() },
      ),
  });
  const undoableDelete = useUndoableDelete();

  function moveTo(targetId: string | null): string | null {
    move.mutate({ id: doc.id, folderId: targetId });
    return null;
  }

  function submitDelete() {
    setConfirmDelete(false);
    undoableDelete({ kind: "document", id: doc.id, label: doc.title });
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
            <AppLink
              href={`/documents/${doc.id}`}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
            >
              <FileText className="size-4 text-gray-500" />
              詳細
            </AppLink>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setMoving(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
            >
              <FolderInput className="size-4 text-gray-500" />
              移動
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
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

      {moving && (
        <MoveDialog
          title={`「${doc.title}」を移動`}
          rootLabel="未分類"
          onSubmit={moveTo}
          onClose={() => setMoving(false)}
        />
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(false)}>
          <h2 className="text-sm font-semibold">「{doc.title}」を削除しますか？</h2>
          <p className="mt-2 text-xs text-gray-500">
            削除済みの書類は一覧・検索に表示されなくなります。削除後しばらくは「元に戻す」で取り消せます。
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-500"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={submitDelete}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white"
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
