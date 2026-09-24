// (filer) 内でクライアント側だけで描画するルート。ここに該当する遷移は history.pushState で行い、
// サーバー往復なしに FilerApp がストアから描画する(それ以外は通常の App Router 遷移)。
export type ClientRoute = { kind: "home" } | { kind: "folders" } | { kind: "folder"; id: string };

export function matchClientRoute(pathname: string): ClientRoute | null {
  if (pathname === "/") return { kind: "home" };
  if (pathname === "/folders") return { kind: "folders" };
  const m = pathname.match(/^\/folders\/([^/]+)$/);
  if (m) return { kind: "folder", id: decodeURIComponent(m[1]) };
  return null;
}

/** href(クエリ・ハッシュ付き可)がクライアント描画ルートを指すか。外部 URL は false。 */
export function isClientHref(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  const pathname = href.split(/[?#]/)[0];
  return matchClientRoute(pathname) !== null;
}
