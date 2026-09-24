// (filer) 内でクライアント側だけで描画するルート。ここに該当する遷移は history.pushState で行い、
// サーバー往復なしに FilerApp がストアから描画する(それ以外は通常の App Router 遷移)。
export type ClientRoute =
  | { kind: "home" }
  | { kind: "folders" }
  | { kind: "folder"; id: string }
  | { kind: "documents" }
  | { kind: "document"; id: string }
  | { kind: "new" }
  | { kind: "search" };

export function matchClientRoute(pathname: string): ClientRoute | null {
  if (pathname === "/") return { kind: "home" };
  if (pathname === "/folders") return { kind: "folders" };
  if (pathname === "/documents") return { kind: "documents" };
  if (pathname === "/search") return { kind: "search" };
  const m = pathname.match(/^\/folders\/([^/]+)$/);
  if (m) return { kind: "folder", id: decodeURIComponent(m[1]) };
  if (pathname === "/documents/new") return { kind: "new" };
  const d = pathname.match(/^\/documents\/([^/]+)$/);
  if (d) return { kind: "document", id: decodeURIComponent(d[1]) };
  return null;
}

/** href(クエリ・ハッシュ付き可)がクライアント描画ルートを指すか。外部 URL は false。 */
export function isClientHref(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  const pathname = href.split(/[?#]/)[0];
  return matchClientRoute(pathname) !== null;
}

// 書類一覧(/documents)のクエリ。サイドバー導線: 期限が近い=expiring_within / 未分類=folder_id=none。
export type DocumentListParams = {
  q?: string;
  expiringWithin?: number;
  unclassified: boolean;
};

export function parseDocumentListParams(sp: URLSearchParams): DocumentListParams {
  const q = sp.get("q")?.trim() || undefined;
  const raw = sp.get("expiring_within");
  const within = raw ? Number(raw) : NaN;
  const expiringWithin = Number.isFinite(within) && within >= 0 ? within : undefined;
  return { q, expiringWithin, unclassified: sp.get("folder_id") === "none" };
}

export type DocumentListScreen = {
  title: string;
  emptyMessage: string;
  // null は検索語未入力(一覧を出さない)
  params: DocumentListParams | null;
  // 検索ページなら現在のクエリ(検索窓の初期値)
  search?: { query: string };
};

/** 書類一覧/検索ページの見出し・空表示・絞り込み条件。見出しは 期限 > 未分類 > 検索語 > 最近追加 の優先。 */
export function documentListScreen(
  kind: "documents" | "search",
  sp: URLSearchParams,
): DocumentListScreen {
  if (kind === "search") {
    const q = sp.get("q")?.trim() ?? "";
    return q
      ? {
          title: `「${q}」の検索結果`,
          emptyMessage: "該当する書類がありません",
          params: { q, unclassified: false },
          search: { query: q },
        }
      : {
          title: "検索",
          emptyMessage: "キーワードを入力してください",
          params: null,
          search: { query: "" },
        };
  }

  const params = parseDocumentListParams(sp);
  if (params.expiringWithin !== undefined) {
    return { title: "期限が近い書類", emptyMessage: "期限が近い書類はありません", params };
  }
  if (params.unclassified) {
    return { title: "未分類", emptyMessage: "未分類の書類はありません", params };
  }
  if (params.q) {
    return {
      title: `「${params.q}」の検索結果`,
      emptyMessage: "該当する書類がありません",
      params,
    };
  }
  return { title: "最近追加した書類", emptyMessage: "まだ書類がありません", params };
}
