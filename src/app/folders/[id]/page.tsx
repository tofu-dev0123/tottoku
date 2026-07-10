import { notFound } from "next/navigation";
import { DesktopFiler } from "@/components/home/DesktopFiler";
import { MobileFolderView } from "@/components/home/MobileFolderView";
import { auth } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { getFilerData } from "@/server/filer";

// フォルダ詳細。モバイルはフォルダ画面、PC はファイラー。存在しなければ 404。
export default async function FolderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let filer;
  try {
    filer = await getFilerData(id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const session = await auth();

  return (
    <>
      <div className="md:hidden">
        <MobileFolderView view={filer.view} />
      </div>
      <div className="hidden md:block">
        <DesktopFiler
          displayName={session?.user?.displayName ?? ""}
          email={session?.user?.email ?? null}
          sidebarFolders={filer.sidebarFolders}
          counts={filer.counts}
          view={filer.view}
        />
      </div>
    </>
  );
}
