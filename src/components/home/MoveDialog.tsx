"use client";

import { Folder, Loader2 } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

type TreeNode = { id: string; name: string; children: TreeNode[] };
type Flat = { id: string; name: string; depth: number };

function flatten(nodes: TreeNode[], depth: number, out: Flat[]): void {
  for (const n of nodes) {
    out.push({ id: n.id, name: n.name, depth });
    flatten(n.children, depth + 1, out);
  }
}

// id のサブツリー(自分自身を含む)の id 集合。フォルダ移動で移動先候補から除外する用途。
function subtreeIds(nodes: TreeNode[], targetId: string): Set<string> {
  const out = new Set<string>();
  const collect = (n: TreeNode) => {
    out.add(n.id);
    n.children.forEach(collect);
  };
  const find = (list: TreeNode[]): boolean => {
    for (const n of list) {
      if (n.id === targetId) {
        collect(n);
        return true;
      }
      if (find(n.children)) return true;
    }
    return false;
  };
  find(nodes);
  return out;
}

// 書類/フォルダの移動先フォルダを選ぶダイアログ。
// フォルダツリーを取得して単一選択で移動先を選び、onSubmit に渡す。
//   rootLabel        … 「トップ(最上位)」/「未分類」など、フォルダなし(null)の表示名
//   excludeSubtreeOf … フォルダ移動時に指定。自分自身と子孫を移動先候補から除外(循環参照防止)
//   onSubmit         … 移動を実行。成功なら null、失敗ならエラーメッセージを返す
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
  onSubmit: (targetId: string | null) => Promise<string | null>;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<Flat[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch("/api/folders/tree");
      const tree: TreeNode[] = res.ok ? await res.json().catch(() => []) : [];
      if (!alive) return;
      const exclude = excludeSubtreeOf ? subtreeIds(tree, excludeSubtreeOf) : new Set<string>();
      const flat: Flat[] = [];
      flatten(tree, 0, flat);
      setOptions(flat.filter((f) => !exclude.has(f.id)));
    })();
    return () => {
      alive = false;
    };
  }, [excludeSubtreeOf]);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const message = await onSubmit(selected);
    if (message) {
      setBusy(false);
      setError(message);
    } else {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 text-left font-normal text-gray-900"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-gray-500">移動先を選んでください。</p>

        <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-gray-200">
          {options === null ? (
            <p className="px-3 py-4 text-center text-xs text-gray-400">読み込み中…</p>
          ) : (
            <>
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
            </>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || options === null}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
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
