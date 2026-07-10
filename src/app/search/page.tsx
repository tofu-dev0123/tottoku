import { DesktopDocumentList } from "@/components/documents/DesktopDocumentList";
import { MobileDocumentList } from "@/components/documents/MobileDocumentList";
import { auth } from "@/lib/auth";
import { type FilerDocument, getDocumentList, getFilerCounts } from "@/server/filer";
import { listFolders } from "@/server/folders";

// 書類検索。タイトル部分一致(?q=)。結果はサーバー側でレンダリングする。
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const [session, sidebarFolders, counts, documents] = await Promise.all([
    auth(),
    listFolders(null),
    getFilerCounts(),
    q ? getDocumentList({ q }) : Promise.resolve<FilerDocument[]>([]),
  ]);

  const title = q ? `「${q}」の検索結果` : "検索";
  const emptyMessage = q ? "該当する書類がありません" : "キーワードを入力してください";

  return (
    <>
      <div className="md:hidden">
        <MobileDocumentList
          title={title}
          documents={documents}
          search={{ query: q }}
          emptyMessage={emptyMessage}
        />
      </div>
      <div className="hidden md:block">
        <DesktopDocumentList
          displayName={session?.user?.displayName ?? ""}
          email={session?.user?.email ?? null}
          image={session?.user?.image ?? null}
          sidebarFolders={sidebarFolders}
          counts={counts}
          activeKey=""
          title={title}
          documents={documents}
          search={{ query: q }}
          emptyMessage={emptyMessage}
        />
      </div>
    </>
  );
}
