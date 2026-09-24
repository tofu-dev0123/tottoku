import { DesktopFiler } from "@/components/home/DesktopFiler";
import { MobileHome } from "@/components/home/MobileHome";
import { auth } from "@/lib/auth";
import { getExpiringDocuments } from "@/server/dashboard";
import { getFilerView } from "@/server/filer";

// ホーム。モバイルは「ホーム」(MobileHome)、PC はファイラー(DesktopFiler ルート)。
export default async function HomePage() {
  const [session, expiring, view] = await Promise.all([
    auth(),
    getExpiringDocuments(),
    getFilerView(null),
  ]);
  const displayName = session?.user?.displayName ?? "";
  const image = session?.user?.image ?? null;

  return (
    <>
      <div className="md:hidden">
        <MobileHome displayName={displayName} image={image} docs={expiring} />
      </div>
      <div className="hidden md:block">
        <DesktopFiler view={view} />
      </div>
    </>
  );
}
