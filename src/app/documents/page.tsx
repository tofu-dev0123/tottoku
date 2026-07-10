import { DesktopDocumentList } from "@/components/documents/DesktopDocumentList";
import { MobileDocumentList } from "@/components/documents/MobileDocumentList";
import type { SidebarKey } from "@/components/home/FilerSidebar";
import { auth } from "@/lib/auth";
import { type DocumentListFilter, getDocumentList, getFilerCounts } from "@/server/filer";
import { listFolders } from "@/server/folders";

// 書類一覧。サイドバー導線(期限が近い=expiring_within / 未分類=folder_id=none / 最近追加)に対応。
export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ expiring_within?: string; folder_id?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const within = sp.expiring_within ? Number(sp.expiring_within) : NaN;
  const expiringWithin = Number.isFinite(within) && within >= 0 ? within : undefined;
  const unclassified = sp.folder_id === "none";

  const filter: DocumentListFilter = { q, expiringWithin, unclassified };

  let title: string;
  let activeKey: SidebarKey;
  let emptyMessage: string;
  if (expiringWithin !== undefined) {
    title = "期限が近い書類";
    activeKey = "expiring";
    emptyMessage = "期限が近い書類はありません";
  } else if (unclassified) {
    title = "未分類";
    activeKey = "unclassified";
    emptyMessage = "未分類の書類はありません";
  } else if (q) {
    title = `「${q}」の検索結果`;
    activeKey = "";
    emptyMessage = "該当する書類がありません";
  } else {
    title = "最近追加した書類";
    activeKey = "recent";
    emptyMessage = "まだ書類がありません";
  }

  const [session, sidebarFolders, counts, documents] = await Promise.all([
    auth(),
    listFolders(null),
    getFilerCounts(),
    getDocumentList(filter),
  ]);

  return (
    <>
      <div className="md:hidden">
        <MobileDocumentList title={title} documents={documents} emptyMessage={emptyMessage} />
      </div>
      <div className="hidden md:block">
        <DesktopDocumentList
          displayName={session?.user?.displayName ?? ""}
          email={session?.user?.email ?? null}
          image={session?.user?.image ?? null}
          sidebarFolders={sidebarFolders}
          counts={counts}
          activeKey={activeKey}
          title={title}
          documents={documents}
          emptyMessage={emptyMessage}
        />
      </div>
    </>
  );
}
