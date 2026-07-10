import { DesktopFiler } from "@/components/home/DesktopFiler";
import { MobileHome } from "@/components/home/MobileHome";
import { auth } from "@/lib/auth";
import { getExpiringDocuments } from "@/server/dashboard";
import { getFilerData } from "@/server/filer";

// ホーム。モバイルは「ホーム」(MobileHome)、PC はファイラー(DesktopFiler ルート)。
export default async function HomePage() {
  const [session, expiring, filer] = await Promise.all([
    auth(),
    getExpiringDocuments(),
    getFilerData(null),
  ]);
  const displayName = session?.user?.displayName ?? "";
  const email = session?.user?.email ?? null;

  return (
    <>
      <div className="md:hidden">
        <MobileHome displayName={displayName} docs={expiring} />
      </div>
      <div className="hidden md:block">
        <DesktopFiler
          displayName={displayName}
          email={email}
          sidebarFolders={filer.sidebarFolders}
          counts={filer.counts}
          view={filer.view}
        />
      </div>
    </>
  );
}
