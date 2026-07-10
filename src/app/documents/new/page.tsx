import { DocumentUploadForm } from "@/components/documents/DocumentUploadForm";
import { getFolderOptions } from "@/server/folders";

// 書類の追加(アップロード)。?folder_id で所属フォルダを初期選択できる。
export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ folder_id?: string }>;
}) {
  const [{ folder_id }, folderOptions] = await Promise.all([searchParams, getFolderOptions()]);
  const preselect = folderOptions.some((o) => o.id === folder_id) ? (folder_id ?? null) : null;

  return (
    <div className="min-h-dvh bg-gray-50">
      <DocumentUploadForm folderOptions={folderOptions} preselectFolderId={preselect} />
    </div>
  );
}
