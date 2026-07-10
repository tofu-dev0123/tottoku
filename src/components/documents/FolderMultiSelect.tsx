"use client";

import { Check, Folder } from "lucide-react";

export type FolderOption = { id: string; name: string; depth: number };

// 所属フォルダの複数選択。ツリー順のフラットなチェックリスト(深さでインデント)。
export function FolderMultiSelect({
  options,
  value,
  onChange,
}: {
  options: FolderOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  if (options.length === 0) {
    return (
      <p className="text-xs text-gray-400">フォルダがありません（未分類のまま保存されます）</p>
    );
  }

  return (
    <div className="max-h-52 overflow-auto rounded-lg border border-gray-200">
      {options.map((f) => {
        const checked = value.includes(f.id);
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => toggle(f.id)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            style={{ paddingLeft: `${12 + f.depth * 16}px` }}
          >
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                checked ? "border-blue-700 bg-blue-700 text-white" : "border-gray-300"
              }`}
            >
              {checked && <Check className="size-3" />}
            </span>
            <Folder className="size-4 shrink-0 text-blue-700" />
            <span className="truncate">{f.name}</span>
          </button>
        );
      })}
    </div>
  );
}
