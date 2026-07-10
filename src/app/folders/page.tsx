import { DesktopFiler } from "@/components/home/DesktopFiler";
import { MobileFolderView } from "@/components/home/MobileFolderView";
import { auth } from "@/lib/auth";
import { getFilerData } from "@/server/filer";

// フォルダのルート。モバイルはフォルダ画面(画面2)、PC はファイラー。
export default async function FoldersPage() {
  const [session, filer] = await Promise.all([auth(), getFilerData(null)]);

  return (
    <>
      <div className="md:hidden">
        <MobileFolderView view={filer.view} />
      </div>
      <div className="hidden md:block">
        <DesktopFiler
          displayName={session?.user?.displayName ?? ""}
          email={session?.user?.email ?? null}
          image={session?.user?.image ?? null}
          sidebarFolders={filer.sidebarFolders}
          counts={filer.counts}
          view={filer.view}
        />
      </div>
    </>
  );
}
