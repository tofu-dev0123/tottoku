import { FilerSidebar } from "@/components/home/FilerSidebar";
import { auth } from "@/lib/auth";
import { getFilerCounts } from "@/server/filer";
import { listFolders } from "@/server/folders";

// ファイラー系(ホーム/フォルダ/一覧/検索)の共通レイアウト。PC のサイドバーをここで1回だけ描画し、
// 配下の遷移ではサイドバーを保持したままメイン領域だけを差し替える(loading もメイン領域のみ)。
// 変更後の router.refresh() でレイアウトも再描画されるため、件数・フォルダは最新に追従する。

// セッションを参照しないページ(フォルダ等)がビルド時に静的プリレンダリングされ DB データが
// 焼き込まれないよう、配下全体を動的化する(認証必須・家族の最新データを毎リクエスト出す)。
export const dynamic = "force-dynamic";

export default async function FilerLayout({ children }: { children: React.ReactNode }) {
  const [session, sidebarFolders, counts] = await Promise.all([
    auth(),
    listFolders(null),
    getFilerCounts(),
  ]);

  return (
    <div className="md:flex md:h-dvh md:bg-white md:text-gray-900">
      <div className="hidden md:flex">
        <FilerSidebar
          displayName={session?.user?.displayName ?? ""}
          email={session?.user?.email ?? null}
          image={session?.user?.image ?? null}
          sidebarFolders={sidebarFolders}
          counts={counts}
        />
      </div>
      <div className="min-w-0 md:flex-1">{children}</div>
    </div>
  );
}
