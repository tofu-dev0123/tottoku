"use client";

import { ChevronDown, ChevronUp, Upload } from "lucide-react";
import { useState } from "react";
import { UploadActions } from "./UploadRows";
import { useUploadQueue } from "./upload-queue";

// (filer) 全体に出すアップロード状況。どの画面にいても進捗と失敗(再試行/破棄)が分かるようにする。
export function UploadIndicator() {
  const uploads = useUploadQueue();
  const [open, setOpen] = useState(false);
  if (uploads.length === 0) return null;

  const failed = uploads.filter((u) => u.status === "error").length;
  const active = uploads.length - failed;
  const bytes = uploads.reduce((s, u) => s + u.size, 0);
  const sent = uploads.reduce(
    (s, u) => s + u.size * (u.status === "uploading" ? u.progress : 1),
    0,
  );
  const ratio = bytes > 0 ? sent / bytes : 1;

  return (
    <div className="fixed inset-x-4 top-3 z-[55] mx-auto max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg md:inset-x-auto md:top-auto md:right-6 md:bottom-6 md:w-80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <Upload className={`size-4 shrink-0 ${failed > 0 ? "text-red-500" : "text-blue-700"}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {active > 0 ? `${active} 件をアップロード中` : "アップロードに失敗しました"}
            {active > 0 && failed > 0 && `(失敗 ${failed} 件)`}
          </p>
          {active > 0 && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-[width]"
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>
          )}
        </div>
        {open ? (
          <ChevronDown className="size-4 text-gray-400" />
        ) : (
          <ChevronUp className="size-4 text-gray-400" />
        )}
      </button>
      {(open || failed > 0) && (
        <ul className="max-h-60 overflow-auto border-t border-gray-100">
          {uploads
            .filter((u) => open || u.status === "error")
            .map((u) => (
              <li key={u.id} className="flex items-center gap-2 px-4 py-2 text-xs">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-gray-700">{u.meta.title}</span>
                  {u.status === "error" && (
                    <span className="block truncate text-red-600">{u.error}</span>
                  )}
                </span>
                <UploadActions upload={u} />
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
