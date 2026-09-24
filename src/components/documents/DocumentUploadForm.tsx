"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, FileText, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { AppLink, useAppRouter } from "@/components/home/AppLink";
import { enqueueUploads } from "@/components/home/upload-queue";
import { bootstrapQueryKey } from "@/lib/bootstrap-query";
import {
  isAllowedMimeType,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_COUNT,
  MAX_UPLOAD_TOTAL_BYTES,
  UPLOAD_ACCEPT,
} from "@/lib/upload-constraints";
import { FolderSelect, type FolderOption } from "./FolderSelect";
import { TagsInput } from "./TagsInput";

function stripExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(0, dot) : filename;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// 入力の検証状態(転送・登録の状態はアップロードキュー側で持つ)
type EntryStatus = "pending" | "error";

// 1ファイル = 1書類ぶんの入力。メタはファイルごとに個別に持つ。
type Entry = {
  key: string;
  file: File;
  title: string;
  docDate: string;
  expiryDate: string;
  memo: string;
  folderId: string | null;
  tags: string[];
  status: EntryStatus;
  error?: string;
};

function initialStatus(file: File): { status: EntryStatus; error?: string } {
  if (!isAllowedMimeType(file.type)) return { status: "error", error: "対応していない形式です" };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { status: "error", error: `上限 ${formatBytes(MAX_UPLOAD_BYTES)} を超えています` };
  }
  return { status: "pending" };
}

// 書類の一括アップロード。複数ファイルを選び、ファイルごとにメタを入力して「登録」すると
// アップロードキューに積んで即座に保存先へ移る(presign → S3 直 PUT → 登録は裏で進む)。
// 失敗した書類は一覧・アップロード状況から再試行/破棄できる。
export function DocumentUploadForm({
  folderOptions,
  preselectFolderId,
}: {
  folderOptions: FolderOption[];
  preselectFolderId?: string | null;
}) {
  const appRouter = useAppRouter();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<Entry[]>([]);
  // 共通設定(全ファイルに適用)。新規追加ファイルの初期値にも使う。
  const [commonFolderId, setCommonFolderId] = useState<string | null>(preselectFolderId ?? null);
  const [commonTags, setCommonTags] = useState<string[]>([]);
  const [commonExpiry, setCommonExpiry] = useState("");

  const [error, setError] = useState<string | null>(null);

  const totalBytes = entries.reduce((sum, e) => sum + e.file.size, 0);
  const overCount = entries.length > MAX_UPLOAD_COUNT;
  const overSize = totalBytes > MAX_UPLOAD_TOTAL_BYTES;

  function patch(key: string, partial: Partial<Entry>) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...partial } : e)));
  }

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    const additions: Entry[] = Array.from(list).map((file) => ({
      key: crypto.randomUUID(),
      file,
      title: stripExt(file.name),
      docDate: "",
      expiryDate: commonExpiry,
      memo: "",
      folderId: commonFolderId,
      tags: [...commonTags],
      ...initialStatus(file),
    }));
    setEntries((prev) => [...prev, ...additions]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeEntry(key: string) {
    setEntries((prev) => prev.filter((e) => e.key !== key));
  }

  // 共通設定を全ファイルへ反映。
  function applyCommon() {
    setEntries((prev) =>
      prev.map((e) => ({
        ...e,
        folderId: commonFolderId,
        tags: [...commonTags],
        expiryDate: commonExpiry,
      })),
    );
  }

  function validateEntry(e: Entry): string | null {
    if (!e.title.trim()) return "タイトルを入力してください";
    if (!isAllowedMimeType(e.file.type)) return "対応していない形式です";
    if (e.file.size > MAX_UPLOAD_BYTES)
      return `上限 ${formatBytes(MAX_UPLOAD_BYTES)} を超えています`;
    return null;
  }

  function submit() {
    setError(null);

    if (entries.length === 0) return setError("ファイルを選択してください");
    if (overCount) return setError(`一度に登録できるのは ${MAX_UPLOAD_COUNT} 件までです`);
    if (overSize)
      return setError(`合計サイズが大きすぎます(上限 ${formatBytes(MAX_UPLOAD_TOTAL_BYTES)})`);

    let invalid = false;
    for (const e of entries) {
      const msg = validateEntry(e);
      if (msg) {
        patch(e.key, { status: "error", error: msg });
        invalid = true;
      }
    }
    if (invalid) return setError("入力に不備があります。各ファイルの内容を確認してください");

    // キューに積んで即座に画面を離れる。転送・登録は裏で進み、一覧に「アップロード中」行が出る。
    enqueueUploads(
      entries.map((e) => ({
        id: crypto.randomUUID(),
        file: e.file,
        meta: {
          title: e.title.trim(),
          docDate: e.docDate || null,
          expiryDate: e.expiryDate || null,
          memo: e.memo.trim() || null,
          folderId: e.folderId,
          tags: e.tags,
        },
      })),
      () => queryClient.invalidateQueries({ queryKey: bootstrapQueryKey }),
    );
    // 保存先フォルダへ(共通設定でフォルダ選択時)、未選択ならホームへ。
    appRouter.push(commonFolderId ? `/folders/${commonFolderId}` : "/");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <AppLink href="/" className="text-sm text-gray-500 hover:text-gray-900">
          キャンセル
        </AppLink>
        <h1 className="text-lg font-semibold">書類を追加</h1>
      </div>

      {/* ファイル選択(複数可) */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white py-8 text-gray-500 hover:border-blue-400 hover:text-blue-700"
      >
        <Upload className="size-7" />
        <span className="text-sm font-medium">
          {entries.length > 0 ? "ファイルを追加" : "ファイルを選択"}
        </span>
        <span className="text-xs text-gray-400">
          PDF・写真(1ファイル {formatBytes(MAX_UPLOAD_BYTES)}まで・複数選択可)
        </span>
      </button>

      {entries.length > 0 && (
        <>
          {/* 件数・合計サイズの表示 */}
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className={overCount || overSize ? "font-medium text-red-600" : "text-gray-500"}>
              {entries.length} 件 ・ 合計 {formatBytes(totalBytes)}
            </span>
            <span className="text-gray-400">
              上限 {MAX_UPLOAD_COUNT} 件 / {formatBytes(MAX_UPLOAD_TOTAL_BYTES)}
            </span>
          </div>

          {/* 共通設定(全ファイルに適用) */}
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">共通設定(全ファイルに適用)</span>
              <button
                type="button"
                onClick={applyCommon}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                全ファイルに適用
              </button>
            </div>
            <div className="space-y-3">
              <Field label="期限">
                <input
                  type="date"
                  value={commonExpiry}
                  onChange={(e) => setCommonExpiry(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </Field>
              <Field label="フォルダ">
                <FolderSelect
                  options={folderOptions}
                  value={commonFolderId}
                  onChange={setCommonFolderId}
                />
              </Field>
              <Field label="タグ">
                <TagsInput value={commonTags} onChange={setCommonTags} />
              </Field>
            </div>
          </div>

          {/* ファイルごとのカード */}
          <div className="mt-4 space-y-3">
            {entries.map((e) => (
              <EntryCard
                key={e.key}
                entry={e}
                folderOptions={folderOptions}
                onChange={(partial) => patch(e.key, partial)}
                onRemove={() => removeEntry(e.key)}
              />
            ))}
          </div>
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={entries.length === 0 || overCount || overSize}
          className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {entries.length > 0 ? `${entries.length} 件を登録` : "登録"}
        </button>
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  folderOptions,
  onChange,
  onRemove,
}: {
  entry: Entry;
  folderOptions: FolderOption[];
  onChange: (partial: Partial<Entry>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <FileText className="size-6 shrink-0 text-blue-700" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{entry.file.name}</p>
          <p className="text-xs text-gray-400">{formatBytes(entry.file.size)}</p>
        </div>
        <StatusBadge status={entry.status} />
        <button
          type="button"
          aria-label="ファイルを外す"
          onClick={onRemove}
          className="flex size-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
        >
          <X className="size-4" />
        </button>
      </div>

      {entry.error && <p className="mt-2 text-xs text-red-600">{entry.error}</p>}

      <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
        <Field label="タイトル" required>
          <input
            value={entry.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="例: 自動車保険 契約更新のご案内"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="書類の日付">
            <input
              type="date"
              value={entry.docDate}
              onChange={(e) => onChange({ docDate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
            />
          </Field>
          <Field label="期限">
            <input
              type="date"
              value={entry.expiryDate}
              onChange={(e) => onChange({ expiryDate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
            />
          </Field>
        </div>

        <Field label="フォルダ">
          <FolderSelect
            options={folderOptions}
            value={entry.folderId}
            onChange={(folderId) => onChange({ folderId })}
          />
        </Field>

        <Field label="タグ">
          <TagsInput value={entry.tags} onChange={(tags) => onChange({ tags })} />
        </Field>

        <Field label="メモ">
          <textarea
            value={entry.memo}
            onChange={(e) => onChange({ memo: e.target.value })}
            rows={2}
            placeholder="任意"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
          />
        </Field>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EntryStatus }) {
  if (status !== "error") return null;
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-600">
      <AlertCircle className="size-4" />
      要確認
    </span>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
