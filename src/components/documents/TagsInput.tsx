"use client";

import { X } from "lucide-react";
import { useState } from "react";

// タグ入力(チップ)。Enter / カンマで確定、× で削除。保存時にサーバーで名前 upsert される。
export function TagsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const name = raw.trim();
    if (!name) return;
    if (!value.includes(name)) onChange([...value, name]);
    setDraft("");
  }

  function remove(name: string) {
    onChange(value.filter((t) => t !== name));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 px-2 py-1.5 focus-within:border-blue-500">
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-0.5 pr-1 pl-2 text-xs text-blue-700"
        >
          {t}
          <button
            type="button"
            aria-label={`${t} を削除`}
            onClick={() => remove(t)}
            className="flex size-4 items-center justify-center rounded-full hover:bg-blue-100"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            remove(value[value.length - 1]);
          }
        }}
        onBlur={() => add(draft)}
        placeholder={value.length === 0 ? "タグを入力して Enter" : ""}
        className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none"
      />
    </div>
  );
}
