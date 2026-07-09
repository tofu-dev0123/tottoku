import { DesktopFiler } from "@/components/home/DesktopFiler";
import { MobileHome } from "@/components/home/MobileHome";
import { auth } from "@/lib/auth";
import { getExpiringDocuments } from "@/server/dashboard";
import { getFilerCounts, getFilerDocuments, getFolderSummaries } from "@/server/filer";

// ホーム。モバイルは「ホーム」(MobileHome)、PC はファイラー(DesktopFiler)を出し分ける。
// 別レイアウトを CSS の可視性で切替(SSR 安全・データ取得は1回)。
export default async function HomePage() {
  const [session, expiring, folders, documents, counts] = await Promise.all([
    auth(),
    getExpiringDocuments(),
    getFolderSummaries(),
    getFilerDocuments(),
    getFilerCounts(),
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
          folders={folders}
          documents={documents}
          counts={counts}
        />
      </div>
    </>
  );
}
