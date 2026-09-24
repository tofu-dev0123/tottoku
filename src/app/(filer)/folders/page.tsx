import { DesktopFiler } from "@/components/home/DesktopFiler";
import { MobileFolderView } from "@/components/home/MobileFolderView";
import { getFilerView } from "@/server/filer";

// フォルダのルート。モバイルはフォルダ画面(画面2)、PC はファイラー。
export default async function FoldersPage() {
  const view = await getFilerView(null);

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
