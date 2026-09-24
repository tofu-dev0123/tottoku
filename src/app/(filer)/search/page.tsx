import { DesktopDocumentList } from "@/components/documents/DesktopDocumentList";
import { MobileDocumentList } from "@/components/documents/MobileDocumentList";
import { getDocumentList } from "@/server/filer";

// 書類検索。タイトル部分一致(?q=)。結果はサーバー側でレンダリングする。
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const documents = q ? await getDocumentList({ q }) : [];

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
          title={title}
          documents={documents}
          search={{ query: q }}
          emptyMessage={emptyMessage}
        />
      </div>
    </>
  );
}
