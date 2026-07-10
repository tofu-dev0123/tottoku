import { notFound } from "next/navigation";
import { DocumentDetail } from "@/components/documents/DocumentDetail";
import { HttpError } from "@/lib/errors";
import { getDocumentDetail } from "@/server/documents";
import { getFolderOptions } from "@/server/folders";

// 書類詳細。閲覧・ダウンロード・編集・削除。存在しない/論理削除済みは 404。
export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let doc;
  try {
    doc = await getDocumentDetail(id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const folderOptions = await getFolderOptions();

  return (
    <div className="min-h-dvh bg-gray-50">
      <DocumentDetail doc={doc} folderOptions={folderOptions} />
    </div>
  );
}
