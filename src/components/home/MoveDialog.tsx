"use client";

import { Folder } from "lucide-react";
import { type ReactNode, useState } from "react";
import { collectDescendantIds, flattenTree } from "@/lib/folder-tree";
import { useBootstrap } from "./use-bootstrap";

// 書類/フォルダの移動先フォルダを選ぶダイアログ。候補はストアのフォルダツリーから即時に出す。
//   rootLabel        … 「トップ(最上位)」/「未分類」など、フォルダなし(null)の表示名
//   excludeSubtreeOf … フォルダ移動時に指定。自分自身と子孫を移動先候補から除外(循環参照防止)
//   onSubmit         … 移動を実行(楽観的更新)。移動できない理由があればその文言、なければ null を返す
export function MoveDialog({
  title,
  rootLabel,
  excludeSubtreeOf,
  onSubmit,
  onClose,
}: {
  title: string;
  rootLabel: string;
  excludeSubtreeOf?: string;
  onSubmit: (targetId: string | null) => string | null;
  onClose: () => void;
}) {
  const data = useBootstrap();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exclude = excludeSubtreeOf
    ? new Set([excludeSubtreeOf, ...collectDescendantIds(data.folders, excludeSubtreeOf)])
    : new Set<string>();
  const options = flattenTree(data.folders).filter((f) => !exclude.has(f.id));

  function submit() {
    const message = onSubmit(selected);
    if (message) setError(message);
    else onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 text-left font-normal text-gray-900"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-gray-500">移動先を選んでください。</p>

        <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-gray-200">
          <OptionRow selected={selected === null} depth={0} onClick={() => setSelected(null)}>
            <span className="truncate text-gray-500">{rootLabel}</span>
          </OptionRow>
          {options.map((f) => (
            <OptionRow
              key={f.id}
              selected={selected === f.id}
              depth={f.depth + 1}
              onClick={() => setSelected(f.id)}
            >
              <Folder className="size-4 shrink-0 text-blue-700" />
              <span className="truncate">{f.name}</span>
            </OptionRow>
          ))}
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-500"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white"
          >
            ここに移動
          </button>
        </div>
      </div>
    </div>
  );
}

function OptionRow({
  selected,
  depth,
  onClick,
  children,
}: {
  selected: boolean;
  depth: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
      style={{ paddingLeft: `${12 + depth * 16}px` }}
    >
      <span
        className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-blue-700" : "border-gray-300"
        }`}
      >
        {selected && <span className="size-2 rounded-full bg-blue-700" />}
      </span>
      {children}
    </button>
  );
}
