// アクティブなサイドバー項目。フォルダは folderId を渡す。
export type SidebarKey = "home" | "expiring" | "unclassified" | "recent" | (string & {});

// サイドバーは共通レイアウトに置くため、アクティブ項目は URL から導出する。
// /documents のクエリ解釈は書類一覧ページ(expiring_within > folder_id=none > q > 最近追加)と揃える。
export function sidebarActiveKey(pathname: string, searchParams: URLSearchParams): SidebarKey {
  if (pathname === "/" || pathname === "/folders") return "home";

  const folder = pathname.match(/^\/folders\/([^/]+)$/);
  if (folder) return decodeURIComponent(folder[1]);

  if (pathname === "/documents") {
    const raw = searchParams.get("expiring_within");
    const within = raw ? Number(raw) : NaN;
    if (Number.isFinite(within) && within >= 0) return "expiring";
    if (searchParams.get("folder_id") === "none") return "unclassified";
    if (searchParams.get("q")?.trim()) return "";
    return "recent";
  }

  return "";
}
