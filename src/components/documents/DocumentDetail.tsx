"use client";

import { ArrowLeft, Download, FileText, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { AppLink, useAppRouter } from "@/components/home/AppLink";
import { useFilerUser } from "@/components/home/FilerUserProvider";
import {
  apiFetch,
  useStoreMutation,
  useUndoableDelete,
} from "@/components/home/use-store-mutations";
import { formatDateJST } from "@/lib/date";
import type { DocumentDetailData } from "@/lib/filer-derive";
import { type DocumentPatch, updateDocument } from "@/lib/store-updates";
import { FolderSelect, type FolderOption } from "./FolderSelect";
import { TagsInput } from "./TagsInput";

function displayDate(d: string | null): string {
  return d ? d.replaceAll("-", "/") : "—";
}

export function DocumentDetail({
  doc,
  folderOptions,
}: {
  doc: DocumentDetailData;
  folderOptions: FolderOption[];
}) {
  const appRouter = useAppRouter();
  const user = useFilerUser();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 保存は楽観的更新(失敗時はトーストで通知して元に戻す)。サーバーへは従来の snake_case で送る。
  const update = useStoreMutation<DocumentPatch>({
    request: (p) =>
      apiFetch(
        `/api/documents/${doc.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: p.title,
            doc_date: p.docDate,
            expiry_date: p.expiryDate,
            memo: p.memo,
            folder_ids: p.folderId ? [p.folderId] : [],
            tags: p.tagNames,
          }),
        },
        "保存に失敗しました",
      ),
    apply: (d, p) =>
      updateDocument(d, doc.id, p, { userId: user.id, now: new Date().toISOString() }),
  });
  const undoableDelete = useUndoableDelete();

  // 編集フォームの状態
  const [title, setTitle] = useState(doc.title);
  const [docDate, setDocDate] = useState(doc.doc_date ?? "");
  const [expiryDate, setExpiryDate] = useState(doc.expiry_date ?? "");
  const [memo, setMemo] = useState(doc.memo ?? "");
  const [folderId, setFolderId] = useState<string | null>(doc.folders[0]?.id ?? null);
  const [tags, setTags] = useState<string[]>(doc.tags);

  function resetEdit() {
    setTitle(doc.title);
    setDocDate(doc.doc_date ?? "");
    setExpiryDate(doc.expiry_date ?? "");
    setMemo(doc.memo ?? "");
    setFolderId(doc.folders[0]?.id ?? null);
    setTags(doc.tags);
    setError(null);
  }

  async function download() {
    setError(null);
    const res = await fetch(`/api/documents/${doc.id}/download`);
    if (!res.ok) {
      setError("ダウンロードURLの取得に失敗しました");
      return;
    }
    const { download_url } = await res.json();
    window.open(download_url, "_blank", "noopener");
  }

  function save() {
    if (!title.trim()) return setError("タイトルを入力してください");
    setError(null);
    update.mutate({
      title: title.trim(),
      docDate: docDate || null,
      expiryDate: expiryDate || null,
      memo: memo.trim() || null,
      folderId,
      tagNames: tags,
    });
    setEditing(false);
  }

  function remove() {
    setConfirmDelete(false);
    appRouter.push("/");
    undoableDelete({ kind: "document", id: doc.id, label: doc.title });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <AppLink
          href="/"
          className="flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
          aria-label="戻る"
        >
          <ArrowLeft className="size-5" />
        </AppLink>
        <div className="flex-1" />
        {!editing && (
          <>
            <button
              type="button"
              onClick={download}
              className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-[13px] font-semibold text-white"
            >
              <Download className="size-4" />
              ダウンロード
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              aria-label="編集"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex size-9 items-center justify-center rounded-lg border border-gray-200 text-red-600 hover:bg-red-50"
              aria-label="削除"
            >
              <Trash2 className="size-4" />
            </button>
          </>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <Field label="タイトル" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
            <FolderSelect options={folderOptions} value={folderId} onChange={setFolderId} />
          </Field>
          <Field label="タグ">
            <TagsInput value={tags} onChange={setTags} />
          </Field>
          <Field label="メモ">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetEdit();
                setEditing(false);
              }}
              className="rounded-lg px-3 py-2 text-sm text-gray-500"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!title.trim()}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 size-7 shrink-0 text-blue-700" />
            <h1 className="text-xl font-semibold break-words">{doc.title}</h1>
          </div>

          <dl className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            <Row label="書類の日付" value={displayDate(doc.doc_date)} />
            <Row label="期限" value={displayDate(doc.expiry_date)} />
            <Row label="フォルダ">
              {doc.folders.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {doc.folders.map((f) => (
                    <AppLink
                      key={f.id}
                      href={`/folders/${f.id}`}
                      className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
                    >
                      {f.name}
                    </AppLink>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400">未分類</span>
              )}
            </Row>
            <Row label="タグ">
              {doc.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {doc.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </Row>
            <Row label="メモ">
              {doc.memo ? (
                <p className="whitespace-pre-wrap text-gray-700">{doc.memo}</p>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </Row>
            <Row label="形式" value={doc.mime_type} />
          </dl>

          <p className="mt-3 text-xs text-gray-400">
            {doc.uploaded_by && <>追加: {doc.uploaded_by.displayName}・</>}
            {formatDateJST(new Date(doc.created_at))}
            {doc.updated_by && (
              <>
                {" ／ 更新: "}
                {doc.updated_by.displayName}・{formatDateJST(new Date(doc.updated_at))}
              </>
            )}
          </p>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold">「{doc.title}」を削除しますか？</h2>
            <p className="mt-2 text-xs text-gray-500">
              削除済みの書類は一覧・検索に表示されなくなります。削除後しばらくは「元に戻す」で取り消せます。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={remove}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 px-4 py-3 text-sm">
      <dt className="w-20 shrink-0 text-gray-400">{label}</dt>
      <dd className="min-w-0 flex-1">{children ?? value}</dd>
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
