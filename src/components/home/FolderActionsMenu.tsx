"use client";

import { FolderInput, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  folderDeletionImpact,
  folderMoveError,
  hasFolderNameConflict,
  moveFolder,
  renameFolder,
} from "@/lib/store-updates";
import { useAppRouter } from "./AppLink";
import { MoveDialog } from "./MoveDialog";
import { useBootstrap } from "./use-bootstrap";
import { apiFetch, useStoreMutation, useUndoableDelete } from "./use-store-mutations";

type RenameVars = { id: string; name: string };
type MoveVars = { id: string; parentId: string | null };

// フォルダのリネーム/移動/削除メニュー(ケバブ)。いずれも楽観的更新で即座に画面へ反映する。
// 同名・循環参照はストアで先に検出してダイアログ内に出し、サーバーでの失敗はトーストで通知して元に戻す。
// 削除は「元に戻す」付き。redirectTo を渡すと削除時にそのパスへ遷移(フォルダ画面で自フォルダを消したとき用)。
export function FolderActionsMenu({
  folder,
  redirectTo,
  variant = "row",
}: {
  folder: { id: string; name: string };
  redirectTo?: string;
  variant?: "row" | "header";
}) {
  const appRouter = useAppRouter();
  const data = useBootstrap();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<"rename" | "move" | "delete" | null>(null);
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState<string | null>(null);

  const rename = useStoreMutation<RenameVars>({
    request: (v) =>
      apiFetch(
        `/api/folders/${v.id}`,
        { method: "PATCH", body: JSON.stringify({ name: v.name }) },
        "名前の変更に失敗しました",
      ),
    apply: (d, v) => renameFolder(d, v.id, v.name),
  });
  const move = useStoreMutation<MoveVars>({
    request: (v) =>
      apiFetch(
        `/api/folders/${v.id}`,
        { method: "PATCH", body: JSON.stringify({ parent_id: v.parentId }) },
        "移動に失敗しました",
      ),
    apply: (d, v) => moveFolder(d, v.id, v.parentId),
  });
  const undoableDelete = useUndoableDelete();

  const parentId = data.folders.find((f) => f.id === folder.id)?.parentId ?? null;

  function close() {
    setMode(null);
    setError(null);
  }

  function openRename() {
    setMenuOpen(false);
    setName(folder.name);
    setError(null);
    setMode("rename");
  }

  function openMove() {
    setMenuOpen(false);
    setError(null);
    setMode("move");
  }

  function openDelete() {
    setMenuOpen(false);
    setError(null);
    setMode("delete");
  }

  // 循環参照・移動先の同名はストアで先に弾く(候補からも自分と子孫は除外済み)
  function moveTo(targetId: string | null): string | null {
    const reason = folderMoveError(data, folder.id, targetId);
    if (reason) return reason;
    if (targetId !== parentId) move.mutate({ id: folder.id, parentId: targetId });
    return null;
  }

  function submitRename() {
    const next = name.trim();
    if (!next) return;
    if (next === folder.name) {
      setMode(null);
      return;
    }
    if (hasFolderNameConflict(data, parentId, next, folder.id)) {
      setError("同じ場所に同名のフォルダがあります");
      return;
    }
    rename.mutate({ id: folder.id, name: next });
    setMode(null);
  }

  function submitDelete() {
    setMode(null);
    // 削除したフォルダを開いていたら親へ移る
    if (redirectTo) appRouter.push(redirectTo);
    undoableDelete({ kind: "folder", id: folder.id, label: folder.name });
  }

  const impact = mode === "delete" ? folderDeletionImpact(data, folder.id) : null;

  const triggerClass =
    variant === "header"
      ? "flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
      : "flex size-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200/70 hover:text-gray-700";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="フォルダ操作"
        onClick={() => setMenuOpen((v) => !v)}
        className={triggerClass}
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
            <button
              type="button"
              onClick={openRename}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
            >
              <Pencil className="size-4 text-gray-500" />
              名前を変更
            </button>
            <button
              type="button"
              onClick={openMove}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
            >
              <FolderInput className="size-4 text-gray-500" />
              移動
            </button>
            <button
              type="button"
              onClick={openDelete}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" />
              削除
            </button>
          </div>
        </>
      )}

      {mode === "rename" && (
        <Modal onClose={close}>
          <h2 className="text-sm font-semibold">名前を変更</h2>
          <input
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
            placeholder="フォルダ名"
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <ModalActions>
            <CancelButton onClick={close} />
            <button
              type="button"
              onClick={submitRename}
              disabled={!name.trim()}
              className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              保存
            </button>
          </ModalActions>
        </Modal>
      )}

      {mode === "move" && (
        <MoveDialog
          title={`「${folder.name}」を移動`}
          rootLabel="トップ（最上位）"
          excludeSubtreeOf={folder.id}
          onSubmit={moveTo}
          onClose={() => setMode(null)}
        />
      )}

      {mode === "delete" && (
        <Modal onClose={close}>
          <h2 className="text-sm font-semibold">「{folder.name}」を削除しますか？</h2>
          {impact && (
            <div className="mt-3 space-y-1 text-xs text-gray-600">
              {impact.descendantFolderCount > 0 && (
                <p>・配下のサブフォルダ {impact.descendantFolderCount} 個も削除されます</p>
              )}
              {impact.documentCount > 0 && (
                <p>
                  ・書類 {impact.documentCount}{" "}
                  件は削除されず、どのフォルダにも属さなくなったものは「未分類」になります
                </p>
              )}
              <p>削除後しばらくは「元に戻す」で取り消せます。</p>
            </div>
          )}
          <ModalActions>
            <CancelButton onClick={close} />
            <button
              type="button"
              onClick={submitDelete}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              削除する
            </button>
          </ModalActions>
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

function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>;
}

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-3 py-1.5 text-sm text-gray-500"
    >
      キャンセル
    </button>
  );
}
