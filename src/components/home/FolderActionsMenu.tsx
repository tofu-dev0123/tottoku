"use client";

import { FolderInput, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { MoveDialog } from "./MoveDialog";

type Impact = { descendantFolderCount: number; documentCount: number };

// フォルダのリネーム/削除メニュー(ケバブ)。作成 UI(NewFolderButton)と同方針:
// 自前モーダル + fetch + router.refresh()、トーストは使わずインラインでエラー表示。
// redirectTo を渡すと削除後にそのパスへ遷移(詳細画面で自フォルダを消したとき用)。
export function FolderActionsMenu({
  folder,
  redirectTo,
  variant = "row",
}: {
  folder: { id: string; name: string };
  redirectTo?: string;
  variant?: "row" | "header";
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<"rename" | "move" | "delete" | null>(null);
  const [name, setName] = useState(folder.name);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    if (busy) return;
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

  // 移動先へ parent_id を更新。循環参照はサーバ側 canMove が弾く(候補からも除外済み)。
  async function moveTo(targetId: string | null): Promise<string | null> {
    const res = await fetch(`/api/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parent_id: targetId }),
    });
    if (res.ok) {
      router.refresh();
      return null;
    }
    const body = await res.json().catch(() => ({}));
    return body.error ?? "移動に失敗しました";
  }

  async function openDelete() {
    setMenuOpen(false);
    setError(null);
    setImpact(null);
    setMode("delete");
    // 削除の影響件数を取得(子孫フォルダ数・紐付け解除される書類数)
    const res = await fetch(`/api/folders/${folder.id}`);
    const body = res.ok ? await res.json().catch(() => null) : null;
    setImpact(body?.impact ?? { descendantFolderCount: 0, documentCount: 0 });
  }

  async function submitRename() {
    const next = name.trim();
    if (!next || busy) return;
    if (next === folder.name) {
      setMode(null);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    setBusy(false);
    if (res.ok) {
      setMode(null);
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "変更に失敗しました");
    }
  }

  async function submitDelete() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
    if (res.ok) {
      setBusy(false);
      setMode(null);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } else {
      setBusy(false);
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "削除に失敗しました");
    }
  }

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
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
            placeholder="フォルダ名"
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <ModalActions>
            <CancelButton onClick={close} disabled={busy} />
            <button
              type="button"
              onClick={submitRename}
              disabled={busy || !name.trim()}
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
          {impact === null ? (
            <p className="mt-3 text-xs text-gray-400">確認中…</p>
          ) : (
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
              {impact.descendantFolderCount === 0 && impact.documentCount === 0 && (
                <p>この操作は取り消せません。</p>
              )}
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <ModalActions>
            <CancelButton onClick={close} disabled={busy} />
            <button
              type="button"
              onClick={submitDelete}
              disabled={busy || impact === null}
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

function CancelButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-3 py-1.5 text-sm text-gray-500 disabled:opacity-50"
    >
      キャンセル
    </button>
  );
}
