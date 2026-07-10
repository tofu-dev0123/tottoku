import { FileText, Upload } from "lucide-react";
import Link from "next/link";
import { FilerSidebar, type SidebarKey } from "@/components/home/FilerSidebar";
import { formatDateJST, todayInJST } from "@/lib/date";
import type { FilerCounts, FilerDocument, FilerFolder } from "@/server/filer";
import { ExpiryPill } from "./ExpiryPill";
import { SearchBox } from "./SearchBox";

const GRID = "grid grid-cols-[1fr_180px_130px_150px] items-center";

// PC の書類一覧/検索ビュー(サイドバー付き)。filer と体裁を揃える。
export function DesktopDocumentList({
  displayName,
  email,
  sidebarFolders,
  counts,
  activeKey,
  title,
  documents,
  search,
  emptyMessage,
}: {
  displayName: string;
  email: string | null;
  sidebarFolders: FilerFolder[];
  counts: FilerCounts;
  activeKey: SidebarKey;
  title: string;
  documents: FilerDocument[];
  // 検索ページなら現在のクエリを渡す。未指定なら検索窓は /search へのリンクにする。
  search?: { query: string };
  emptyMessage: string;
}) {
  const today = todayInJST();

  return (
    <div className="flex h-dvh bg-white text-gray-900">
      <FilerSidebar
        displayName={displayName}
        email={email}
        sidebarFolders={sidebarFolders}
        counts={counts}
        activeKey={activeKey}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2.5">
          <h1 className="text-[15px] font-semibold">{title}</h1>
          <div className="flex-1" />
          <SearchBox initialQuery={search?.query ?? ""} className="w-64" />
          <Link
            href="/documents/new"
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-[13px] font-semibold text-white"
          >
            <Upload className="size-4" />
            書類を追加
          </Link>
        </div>

        <div className="flex-1 overflow-auto">
          <div
            className={`${GRID} sticky top-0 border-b border-gray-200 bg-white px-5 py-2 text-xs text-gray-500`}
          >
            <div>名前</div>
            <div>フォルダ</div>
            <div>追加日</div>
            <div className="text-right">期限</div>
          </div>

          {documents.map((d) => (
            <Link
              key={d.id}
              href={`/documents/${d.id}`}
              className={`${GRID} border-b border-gray-100 px-5 py-2.5 hover:bg-gray-50`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <FileText className="size-5 shrink-0 text-gray-400" />
                <span className="truncate font-medium">{d.title}</span>
              </span>
              <span className="truncate text-[13px] text-gray-500">
                {d.folderNames.length > 0 ? d.folderNames.join(" / ") : "未分類"}
              </span>
              <span className="text-gray-500">{formatDateJST(d.createdAt)}</span>
              <span className="text-right">
                <ExpiryPill expiryDate={d.expiryDate} today={today} />
              </span>
            </Link>
          ))}

          {documents.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-gray-400">{emptyMessage}</p>
          )}
        </div>

        <div className="border-t border-gray-200 px-5 py-1.5 text-xs text-gray-500">
          {documents.length} 書類
        </div>
      </div>
    </div>
  );
}
