"use client";

import { Loader2, Search } from "lucide-react";
import { useState, useTransition } from "react";
import { useAppRouter } from "@/components/home/AppLink";

// 検索入力。Enter で /search?q=... へ遷移(結果はストアからクライアント側で絞り込む)。
// FilerApp の外で使われた場合は通常遷移になるため、useTransition で pending 表示を出す。
export function SearchBox({
  initialQuery = "",
  className = "",
}: {
  initialQuery?: string;
  className?: string;
}) {
  const router = useAppRouter();
  const [q, setQ] = useState(initialQuery);
  const [pending, startTransition] = useTransition();

  function submit() {
    const term = q.trim();
    startTransition(() => {
      router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
    });
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-gray-500 focus-within:border-blue-500 focus-within:bg-white ${className}`}
    >
      {pending ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-blue-600" />
      ) : (
        <Search className="size-4 shrink-0" />
      )}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="書類を検索（例: 自動車保険）"
        className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
      />
    </div>
  );
}
