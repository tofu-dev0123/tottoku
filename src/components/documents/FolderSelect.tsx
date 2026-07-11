"use client";

import { Folder, Inbox } from "lucide-react";

export type FolderOption = { id: string; name: string; depth: number };

// 所属フォルダの単一選択(1書類=1フォルダ)。ツリー順のフラットなラジオリスト(深さでインデント)。
// 先頭に「未分類」を置き、選ぶとフォルダなし(value=null)になる。
export function FolderSelect({
  options,
  value,
  onChange,
}: {
  options: FolderOption[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <div className="max-h-52 overflow-auto rounded-lg border border-gray-200">
      <Row selected={value === null} depth={0} onClick={() => onChange(null)}>
        <Inbox className="size-4 shrink-0 text-gray-400" />
        <span className="truncate text-gray-500">未分類</span>
      </Row>
      {options.map((f) => (
        <Row
          key={f.id}
          selected={value === f.id}
          depth={f.depth + 1}
          onClick={() => onChange(f.id)}
        >
          <Folder className="size-4 shrink-0 text-blue-700" />
          <span className="truncate">{f.name}</span>
        </Row>
      ))}
    </div>
  );
}

function Row({
  selected,
  depth,
  onClick,
  children,
}: {
  selected: boolean;
  depth: number;
  onClick: () => void;
  children: React.ReactNode;
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
