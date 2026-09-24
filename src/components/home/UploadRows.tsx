"use client";

import { AlertCircle, FileText, Loader2, RotateCw, X } from "lucide-react";
import { discardUpload, retryUpload, type UploadItem, useUploadQueue } from "./upload-queue";

/** folderId の階層に保存予定のアップロード(null はルート=未分類)。 */
export function useUploadsIn(folderId: string | null): UploadItem[] {
  return useUploadQueue().filter((u) => u.meta.folderId === folderId);
}

function statusText(u: UploadItem): string {
  if (u.status === "creating") return "登録中…";
  if (u.status === "error") return u.error ?? "失敗しました";
  return `アップロード中 ${Math.round(u.progress * 100)}%`;
}

// 一覧の先頭に出す「アップロード中」の行。folderId の階層に保存予定の書類だけを出す
// (null はルート=未分類)。完了するとストアの本物の書類行に置き換わる。
export function UploadRows({ folderId, dense }: { folderId: string | null; dense?: boolean }) {
  const uploads = useUploadsIn(folderId);
  if (uploads.length === 0) return null;

  return (
    <>
      {uploads.map((u) => (
        <div
          key={u.id}
          className={`flex items-center gap-3 border-b border-gray-100 ${dense ? "py-3" : "px-5 py-2.5"}`}
        >
          {u.status === "error" ? (
            <AlertCircle className="size-5 shrink-0 text-red-500" />
          ) : (
            <FileText className="size-5 shrink-0 text-gray-300" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-500">{u.meta.title}</p>
            <p
              className={`mt-0.5 truncate text-[11px] ${u.status === "error" ? "text-red-600" : "text-gray-400"}`}
            >
              {statusText(u)}
            </p>
            {u.status !== "error" && (
              <div className="mt-1 h-1 w-full max-w-48 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-[width]"
                  style={{
                    width: `${Math.round((u.status === "creating" ? 1 : u.progress) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
          <UploadActions upload={u} />
        </div>
      ))}
    </>
  );
}

export function UploadActions({ upload }: { upload: UploadItem }) {
  if (upload.status !== "error") {
    return <Loader2 className="size-4 shrink-0 animate-spin text-gray-400" />;
  }
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => retryUpload(upload.id)}
        aria-label="再試行"
        className="flex size-7 items-center justify-center rounded-md text-blue-700 hover:bg-blue-50"
      >
        <RotateCw className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => discardUpload(upload.id)}
        aria-label="破棄"
        className="flex size-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
