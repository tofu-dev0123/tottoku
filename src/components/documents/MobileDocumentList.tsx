import { ChevronLeft, FileText, Layers } from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { formatDateJST } from "@/lib/date";
import type { FilerDocument } from "@/server/filer";
import { SearchBox } from "./SearchBox";

// モバイルの書類一覧/検索ビュー。ホームのフォルダ画面と体裁を揃える。
export function MobileDocumentList({
  title,
  documents,
  search,
  emptyMessage,
}: {
  title: string;
  documents: FilerDocument[];
  // 検索ページなら現在のクエリを渡す(検索窓を表示)。
  search?: { query: string };
  emptyMessage: string;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-gray-50 pb-24">
      <header className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <Link href="/" className="text-gray-500" aria-label="ホームへ">
          <ChevronLeft className="size-5" />
        </Link>
        <p className="truncate text-sm font-medium">{title}</p>
      </header>

      {search && (
        <div className="px-4 pt-3">
          <SearchBox initialQuery={search.query} className="w-full py-2.5" />
        </div>
      )}

      <div className="flex-1 px-4 py-2">
        {documents.map((d) => (
          <Link
            key={d.id}
            href={`/documents/${d.id}`}
            className="flex items-center gap-3 border-b border-gray-100 py-3"
          >
            <FileText className="size-6 shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{d.title}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-[11px] text-gray-400">{formatDateJST(d.createdAt)}</span>
                {d.folderNames.length > 1 && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-teal-50 px-1.5 text-[10px] text-teal-700">
                    <Layers className="size-3" />
                    {d.folderNames.length}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}

        {documents.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">{emptyMessage}</p>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  );
}
