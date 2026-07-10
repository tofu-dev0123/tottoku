"use client";

import { FileText, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { isAllowedMimeType, MAX_UPLOAD_BYTES, UPLOAD_ACCEPT } from "@/lib/upload-constraints";
import { FolderMultiSelect, type FolderOption } from "./FolderMultiSelect";
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

// 書類アップロード。presign → S3 へ直接 PUT → メタ登録(POST /api/documents) の3ステップ。
export function DocumentUploadForm({
  folderOptions,
  preselectFolderId,
}: {
  folderOptions: FolderOption[];
  preselectFolderId?: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docDate, setDocDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [memo, setMemo] = useState("");
  const [folderIds, setFolderIds] = useState<string[]>(
    preselectFolderId ? [preselectFolderId] : [],
  );
  const [tags, setTags] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickFile(f: File | null) {
    setError(null);
    if (!f) return;
    setFile(f);
    if (!title.trim()) setTitle(stripExt(f.name));
  }

  async function submit() {
    if (busy) return;
    setError(null);

    if (!file) return setError("ファイルを選択してください");
    if (!title.trim()) return setError("タイトルを入力してください");
    if (!isAllowedMimeType(file.type)) {
      return setError("対応していないファイル形式です（PDF / JPEG / PNG / HEIC / WebP）");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return setError(`ファイルが大きすぎます（上限 ${formatBytes(MAX_UPLOAD_BYTES)}）`);
    }

    setBusy(true);
    try {
      // 1) presign
      setStatus("アップロードURLを取得中…");
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename: file.name, mime_type: file.type, size: file.size }),
      });
      if (!presignRes.ok) {
        const b = await presignRes.json().catch(() => ({}));
        throw new Error(b.error ?? "アップロードURLの取得に失敗しました");
      }
      const { upload_url, s3_key } = await presignRes.json();

      // 2) S3 へ直接 PUT(署名した Content-Type と一致させる)
      setStatus("ファイルをアップロード中…");
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("ファイルのアップロードに失敗しました");

      // 3) メタデータ登録
      setStatus("登録中…");
      const createRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          s3_key,
          mime_type: file.type,
          doc_date: docDate || null,
          expiry_date: expiryDate || null,
          memo: memo.trim() || null,
          folder_ids: folderIds,
          tags,
        }),
      });
      if (!createRes.ok) {
        const b = await createRes.json().catch(() => ({}));
        throw new Error(b.error ?? "登録に失敗しました");
      }
      const doc = await createRes.json();
      router.push(`/documents/${doc.id}`);
    } catch (e) {
      setBusy(false);
      setStatus(null);
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
          キャンセル
        </Link>
        <h1 className="text-lg font-semibold">書類を追加</h1>
      </div>

      {/* ファイル */}
      <input
        ref={fileRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <FileText className="size-6 shrink-0 text-blue-700" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            aria-label="ファイルを外す"
            onClick={() => {
              setFile(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            disabled={busy}
            className="flex size-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white py-10 text-gray-500 hover:border-blue-400 hover:text-blue-700"
        >
          <Upload className="size-7" />
          <span className="text-sm font-medium">ファイルを選択</span>
          <span className="text-xs text-gray-400">PDF・写真（上限 25MB）</span>
        </button>
      )}

      {/* メタデータ */}
      <div className="mt-5 space-y-4">
        <Field label="タイトル" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 自動車保険 契約更新のご案内"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="書類の日付">
            <input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </Field>
          <Field label="期限">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </Field>
        </div>

        <Field label="フォルダ">
          <FolderMultiSelect options={folderOptions} value={folderIds} onChange={setFolderIds} />
        </Field>

        <Field label="タグ">
          <TagsInput value={tags} onChange={setTags} />
        </Field>

        <Field label="メモ">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            placeholder="任意"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </Field>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center justify-end gap-3">
        {busy && status && (
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" />
            {status}
          </span>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={busy || !file || !title.trim()}
          className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          保存
        </button>
      </div>
    </div>
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
