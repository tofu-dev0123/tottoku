import { notFound } from "next/navigation";
import { DesktopFiler } from "@/components/home/DesktopFiler";
import { MobileFolderView } from "@/components/home/MobileFolderView";
import { HttpError } from "@/lib/errors";
import { getFilerView } from "@/server/filer";

// フォルダ詳細。モバイルはフォルダ画面、PC はファイラー。存在しなければ 404。
export default async function FolderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let view;
  try {
    view = await getFilerView(id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }

  return (
    <>
      <div className="md:hidden">
        <MobileFolderView view={view} />
      </div>
      <div className="hidden md:block">
        <DesktopFiler view={view} />
      </div>
    </>
  );
}
