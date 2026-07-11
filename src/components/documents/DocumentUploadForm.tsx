"use client";

import { AlertCircle, CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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

type EntryStatus = "pending" | "uploading" | "uploaded" | "creating" | "done" | "error";

// 1ファイル = 1書類ぶんの入力とアップロード状態。メタはファイルごとに個別に持つ。
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
  s3Key?: string;
};

function initialStatus(file: File): { status: EntryStatus; error?: string } {
  if (!isAllowedMimeType(file.type)) return { status: "error", error: "対応していない形式です" };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { status: "error", error: `上限 ${formatBytes(MAX_UPLOAD_BYTES)} を超えています` };
  }
  return { status: "pending" };
}

const STATUS_LABEL: Record<EntryStatus, string> = {
  pending: "待機",
  uploading: "アップロード中",
  uploaded: "アップロード済み",
  creating: "登録中",
  done: "完了",
  error: "失敗",
};

// 書類の一括アップロード。複数ファイルを選び、ファイルごとにメタを入力して
// バッチ presign → S3 へ各ファイル直 PUT → バッチ登録(POST /api/documents) を行う。
// 一部が失敗しても成功分は登録し、失敗分はフォームに残してリトライできる。
export function DocumentUploadForm({
  folderOptions,
  preselectFolderId,
}: {
  folderOptions: FolderOption[];
  preselectFolderId?: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<Entry[]>([]);
  // 共通設定(全ファイルに適用)。新規追加ファイルの初期値にも使う。
  const [commonFolderId, setCommonFolderId] = useState<string | null>(preselectFolderId ?? null);
  const [commonTags, setCommonTags] = useState<string[]>([]);
  const [commonExpiry, setCommonExpiry] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalBytes = entries.reduce((sum, e) => sum + e.file.size, 0);
  const overCount = entries.length > MAX_UPLOAD_COUNT;
  const overSize = totalBytes > MAX_UPLOAD_TOTAL_BYTES;
  const pendingCount = entries.filter((e) => e.status !== "done").length;

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

  // 共通設定を全ファイルへ反映(完了済みは触らない)。
  function applyCommon() {
    setEntries((prev) =>
      prev.map((e) =>
        e.status === "done"
          ? e
          : {
              ...e,
              folderId: commonFolderId,
              tags: [...commonTags],
              expiryDate: commonExpiry,
            },
      ),
    );
  }

  function validateEntry(e: Entry): string | null {
    if (!e.title.trim()) return "タイトルを入力してください";
    if (!isAllowedMimeType(e.file.type)) return "対応していない形式です";
    if (e.file.size > MAX_UPLOAD_BYTES)
      return `上限 ${formatBytes(MAX_UPLOAD_BYTES)} を超えています`;
    return null;
  }

  async function submit() {
    if (busy) return;
    setError(null);

    if (entries.length === 0) return setError("ファイルを選択してください");
    if (overCount) return setError(`一度に登録できるのは ${MAX_UPLOAD_COUNT} 件までです`);
    if (overSize)
      return setError(`合計サイズが大きすぎます(上限 ${formatBytes(MAX_UPLOAD_TOTAL_BYTES)})`);

    // 完了済みを除いた対象を検証。
    const targets = entries.filter((e) => e.status !== "done");
    if (targets.length === 0) return;

    let invalid = false;
    for (const e of targets) {
      const msg = validateEntry(e);
      if (msg) {
        patch(e.key, { status: "error", error: msg });
        invalid = true;
      }
    }
    if (invalid) return setError("入力に不備があります。各ファイルの内容を確認してください");

    setBusy(true);
    let hadFailure = false;

    // 既に S3 へ上がっているもの(前回の部分失敗など)は再アップロードせず登録だけやり直す。
    const uploaded: { key: string; s3Key: string; entry: Entry }[] = targets
      .filter((e) => e.s3Key)
      .map((e) => ({ key: e.key, s3Key: e.s3Key as string, entry: e }));

    // --- フェーズ1: バッチ presign → 各ファイルを S3 へ直 PUT ---
    const needUpload = targets.filter((e) => !e.s3Key);
    if (needUpload.length > 0) {
      setEntries((prev) =>
        prev.map((e) =>
          needUpload.some((n) => n.key === e.key)
            ? { ...e, status: "uploading", error: undefined }
            : e,
        ),
      );

      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          files: needUpload.map((e) => ({
            filename: e.file.name,
            mime_type: e.file.type,
            size: e.file.size,
          })),
        }),
      });

      if (!presignRes.ok) {
        const b = await presignRes.json().catch(() => ({}));
        const msg = b.error ?? "アップロードURLの取得に失敗しました";
        setEntries((prev) =>
          prev.map((e) =>
            needUpload.some((n) => n.key === e.key) ? { ...e, status: "error", error: msg } : e,
          ),
        );
        hadFailure = true;
      } else {
        const { results } = await presignRes.json();
        await Promise.all(
          needUpload.map(async (e, i) => {
            const r = results[i] as { upload_url: string; s3_key: string };
            try {
              const putRes = await fetch(r.upload_url, {
                method: "PUT",
                headers: { "Content-Type": e.file.type },
                body: e.file,
              });
              if (!putRes.ok) throw new Error();
              patch(e.key, { status: "uploaded", s3Key: r.s3_key, error: undefined });
              uploaded.push({ key: e.key, s3Key: r.s3_key, entry: e });
            } catch {
              patch(e.key, { status: "error", error: "ファイルのアップロードに失敗しました" });
              hadFailure = true;
            }
          }),
        );
      }
    }

    // --- フェーズ2: アップロード成功分をバッチ登録 ---
    if (uploaded.length > 0) {
      setEntries((prev) =>
        prev.map((e) => (uploaded.some((u) => u.key === e.key) ? { ...e, status: "creating" } : e)),
      );

      const createRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documents: uploaded.map((u) => ({
            title: u.entry.title.trim(),
            s3_key: u.s3Key,
            mime_type: u.entry.file.type,
            doc_date: u.entry.docDate || null,
            expiry_date: u.entry.expiryDate || null,
            memo: u.entry.memo.trim() || null,
            folder_ids: u.entry.folderId ? [u.entry.folderId] : [],
            tags: u.entry.tags,
          })),
        }),
      });

      if (!createRes.ok) {
        const b = await createRes.json().catch(() => ({}));
        const msg = b.error ?? "登録に失敗しました";
        setEntries((prev) =>
          prev.map((e) =>
            uploaded.some((u) => u.key === e.key) ? { ...e, status: "error", error: msg } : e,
          ),
        );
        hadFailure = true;
      } else {
        const { results } = (await createRes.json()) as {
          results: { index: number; status: "ok" | "error"; error?: string }[];
        };
        for (const res of results) {
          const u = uploaded[res.index];
          if (!u) continue;
          if (res.status === "ok") {
            patch(u.key, { status: "done", error: undefined });
          } else {
            patch(u.key, { status: "error", error: res.error ?? "登録に失敗しました" });
            hadFailure = true;
          }
        }
      }
    }

    setBusy(false);

    if (!hadFailure) {
      // 全件成功 → 一覧へ。
      router.push("/");
      router.refresh();
    } else {
      setError("一部の登録に失敗しました。失敗した書類はそのまま再実行できます。");
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
        disabled={busy}
        className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white py-8 text-gray-500 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
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
                disabled={busy}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
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
                busy={busy}
                onChange={(partial) => patch(e.key, partial)}
                onRemove={() => removeEntry(e.key)}
              />
            ))}
          </div>
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center justify-end gap-3">
        {busy && (
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" />
            登録処理中…
          </span>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={busy || pendingCount === 0 || overCount || overSize}
          className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pendingCount > 0 ? `${pendingCount} 件を登録` : "登録"}
        </button>
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  folderOptions,
  busy,
  onChange,
  onRemove,
}: {
  entry: Entry;
  folderOptions: FolderOption[];
  busy: boolean;
  onChange: (partial: Partial<Entry>) => void;
  onRemove: () => void;
}) {
  const locked = busy || entry.status === "done";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <FileText className="size-6 shrink-0 text-blue-700" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{entry.file.name}</p>
          <p className="text-xs text-gray-400">{formatBytes(entry.file.size)}</p>
        </div>
        <StatusBadge status={entry.status} />
        {entry.status !== "done" && (
          <button
            type="button"
            aria-label="ファイルを外す"
            onClick={onRemove}
            disabled={busy}
            className="flex size-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {entry.error && <p className="mt-2 text-xs text-red-600">{entry.error}</p>}

      {entry.status !== "done" && (
        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
          <Field label="タイトル" required>
            <input
              value={entry.title}
              onChange={(e) => onChange({ title: e.target.value })}
              disabled={locked}
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
                disabled={locked}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
              />
            </Field>
            <Field label="期限">
              <input
                type="date"
                value={entry.expiryDate}
                onChange={(e) => onChange({ expiryDate: e.target.value })}
                disabled={locked}
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
              disabled={locked}
              rows={2}
              placeholder="任意"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: EntryStatus }) {
  if (status === "done") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-600">
        <CheckCircle2 className="size-4" />
        {STATUS_LABEL.done}
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-red-600">
        <AlertCircle className="size-4" />
        {STATUS_LABEL.error}
      </span>
    );
  }
  if (status === "uploading" || status === "creating") {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        {STATUS_LABEL[status]}
      </span>
    );
  }
  return null;
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
