import { ChevronLeft, FileText, Folder } from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { formatDateJST } from "@/lib/date";
import type { FilerView } from "@/server/filer";
import { DocumentActionsMenu } from "./DocumentActionsMenu";
import { FolderActionsMenu } from "./FolderActionsMenu";
import { NewFolderButton } from "./NewFolderButton";

function folderHref(id: string | null): string {
  return id === null ? "/folders" : `/folders/${id}`;
}

// モバイルのフォルダ画面(画面2)。フォルダ/書類の一覧・遷移・作成。
export function MobileFolderView({ view }: { view: FilerView }) {
  const parent = view.breadcrumb.length > 1 ? view.breadcrumb[view.breadcrumb.length - 2] : null;
  const current = view.breadcrumb[view.breadcrumb.length - 1];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-gray-50 pb-24">
      <header className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
        {parent ? (
          <Link href={folderHref(parent.id)} className="text-gray-500">
            <ChevronLeft className="size-5" />
          </Link>
        ) : (
          <Folder className="size-5 text-blue-700" />
        )}
        <p className="truncate text-sm font-medium">{current.name}</p>
        {view.currentFolderId && (
          <>
            <div className="flex-1" />
            <FolderActionsMenu
              variant="header"
              folder={{ id: view.currentFolderId, name: current.name }}
              redirectTo={folderHref(parent?.id ?? null)}
            />
          </>
        )}
      </header>

      <div className="flex-1 px-4 py-2">
        {view.folders.map((f) => (
          <div key={f.id} className="relative">
            <Link
              href={`/folders/${f.id}`}
              className="flex items-center gap-3 border-b border-gray-100 py-3 pr-9 transition active:opacity-60"
            >
              <Folder className="size-6 text-blue-700" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-[11px] text-gray-400">{f.count}件</p>
              </div>
            </Link>
            <div className="absolute inset-y-0 right-0 flex items-center">
              <FolderActionsMenu folder={{ id: f.id, name: f.name }} />
            </div>
          </div>
        ))}

        {view.documents.map((d) => (
          <div key={d.id} className="relative">
            <Link
              href={`/documents/${d.id}`}
              className="flex items-center gap-3 border-b border-gray-100 py-3 pr-9 transition active:opacity-60"
            >
              <FileText className="size-6 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{d.title}</p>
                <span className="mt-0.5 block text-[11px] text-gray-400">
                  {formatDateJST(d.createdAt)}
                </span>
              </div>
            </Link>
            <div className="absolute inset-y-0 right-0 flex items-center">
              <DocumentActionsMenu doc={{ id: d.id, title: d.title }} />
            </div>
          </div>
        ))}

        {view.folders.length === 0 && view.documents.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">このフォルダは空です</p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-16 mx-auto flex max-w-md gap-2 px-4">
        <NewFolderButton parentId={view.currentFolderId} variant="block" />
      </div>

      <BottomNav active="folders" />
    </div>
  );
}
