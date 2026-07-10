import { ChevronLeft, ChevronRight, FileText, Folder, Upload } from "lucide-react";
import Link from "next/link";
import { ExpiryPill } from "@/components/documents/ExpiryPill";
import { SearchBox } from "@/components/documents/SearchBox";
import { formatDateJST, todayInJST } from "@/lib/date";
import type { FilerCounts, FilerFolder, FilerView } from "@/server/filer";
import { FilerSidebar } from "./FilerSidebar";
import { FolderActionsMenu } from "./FolderActionsMenu";
import { NewFolderButton } from "./NewFolderButton";

const GRID = "grid grid-cols-[1fr_180px_130px_150px] items-center";

function folderHref(id: string | null): string {
  return id === null ? "/" : `/folders/${id}`;
}

export function DesktopFiler({
  displayName,
  email,
  sidebarFolders,
  counts,
  view,
}: {
  displayName: string;
  email: string | null;
  sidebarFolders: FilerFolder[];
  counts: FilerCounts;
  view: FilerView;
}) {
  const today = todayInJST();
  const parent = view.breadcrumb.length > 1 ? view.breadcrumb[view.breadcrumb.length - 2] : null;

  return (
    <div className="flex h-dvh bg-white text-gray-900">
      <FilerSidebar
        displayName={displayName}
        email={email}
        sidebarFolders={sidebarFolders}
        counts={counts}
        activeKey={view.currentFolderId ?? "home"}
      />

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2.5">
          <div className="flex text-gray-400">
            <span className="flex size-7 items-center justify-center rounded-md">
              <ChevronLeft className="size-4" />
            </span>
            {parent ? (
              <Link
                href={folderHref(parent.id)}
                className="flex size-7 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100"
              >
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className="flex size-7 items-center justify-center rounded-md">
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
          <nav className="flex items-center gap-1 text-[15px] font-semibold">
            {view.breadcrumb.map((b, i) => {
              const last = i === view.breadcrumb.length - 1;
              return (
                <span key={b.id ?? "root"} className="flex items-center gap-1">
                  {i > 0 && <span className="text-gray-300">/</span>}
                  {last ? (
                    <span>{b.name}</span>
                  ) : (
                    <Link href={folderHref(b.id)} className="text-gray-500 hover:text-gray-900">
                      {b.name}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
          {view.currentFolderId && (
            <FolderActionsMenu
              variant="header"
              folder={{
                id: view.currentFolderId,
                name: view.breadcrumb[view.breadcrumb.length - 1].name,
              }}
              redirectTo={folderHref(parent?.id ?? null)}
            />
          )}
          <div className="flex-1" />
          <SearchBox className="w-56" />
          <NewFolderButton parentId={view.currentFolderId} />
          <Link
            href={
              view.currentFolderId
                ? `/documents/new?folder_id=${view.currentFolderId}`
                : "/documents/new"
            }
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-[13px] font-semibold text-white"
          >
            <Upload className="size-4" />
            書類を追加
          </Link>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          <div
            className={`${GRID} sticky top-0 border-b border-gray-200 bg-white px-5 py-2 text-xs text-gray-500`}
          >
            <div>名前</div>
            <div>フォルダ</div>
            <div>追加日</div>
            <div className="text-right">期限</div>
          </div>

          {view.folders.map((f) => (
            <div key={f.id} className="group relative">
              <Link
                href={`/folders/${f.id}`}
                className={`${GRID} border-b border-gray-100 px-5 py-2.5 hover:bg-gray-50`}
              >
                <span className="flex items-center gap-3">
                  <Folder className="size-5 text-blue-700" />
                  <span className="font-medium">{f.name}</span>
                </span>
                <span className="text-gray-400">—</span>
                <span className="text-gray-500">{f.count}件</span>
                <span />
              </Link>
              <div className="absolute inset-y-0 right-3 flex items-center">
                <FolderActionsMenu folder={{ id: f.id, name: f.name }} />
              </div>
            </div>
          ))}

          {view.documents.map((d) => (
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

          {view.folders.length === 0 && view.documents.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-gray-400">このフォルダは空です</p>
          )}
        </div>

        <div className="border-t border-gray-200 px-5 py-1.5 text-xs text-gray-500">
          {view.folders.length} フォルダ・{view.documents.length} 書類
        </div>
      </div>
    </div>
  );
}
