import { describe, expect, it } from "vitest";
import { documentListScreen, isClientHref, matchClientRoute } from "./client-routes";

describe("matchClientRoute", () => {
  it("ホーム・フォルダ・書類一覧・書類詳細・書類追加・検索に一致する", () => {
    expect(matchClientRoute("/")).toEqual({ kind: "home" });
    expect(matchClientRoute("/folders")).toEqual({ kind: "folders" });
    expect(matchClientRoute("/folders/abc-123")).toEqual({ kind: "folder", id: "abc-123" });
    expect(matchClientRoute("/documents")).toEqual({ kind: "documents" });
    expect(matchClientRoute("/search")).toEqual({ kind: "search" });
    expect(matchClientRoute("/documents/abc")).toEqual({ kind: "document", id: "abc" });
    expect(matchClientRoute("/documents/new")).toEqual({ kind: "new" });
  });

  it("サーバー描画のルートには一致しない", () => {
    expect(matchClientRoute("/documents/abc/extra")).toBeNull();
    expect(matchClientRoute("/notifications")).toBeNull();
    expect(matchClientRoute("/folders/abc/extra")).toBeNull();
  });
});

describe("isClientHref", () => {
  it("クエリ・ハッシュを除いたパスで判定する", () => {
    expect(isClientHref("/folders/abc?x=1")).toBe(true);
    expect(isClientHref("/#top")).toBe(true);
    expect(isClientHref("/documents?expiring_within=30")).toBe(true);
    expect(isClientHref("/documents/abc?x=1")).toBe(true);
    expect(isClientHref("/documents/new?folder_id=abc")).toBe(true);
    expect(isClientHref("/notifications")).toBe(false);
  });

  it("外部 URL・プロトコル相対 URL は対象外", () => {
    expect(isClientHref("https://example.com/")).toBe(false);
    expect(isClientHref("//example.com/folders")).toBe(false);
  });
});

describe("documentListScreen", () => {
  const screen = (kind: "documents" | "search", query = "") =>
    documentListScreen(kind, new URLSearchParams(query));

  it("書類一覧は 期限 > 未分類 > 検索語 > 最近追加 の優先で見出しを決める", () => {
    expect(screen("documents", "expiring_within=30&folder_id=none").title).toBe("期限が近い書類");
    expect(screen("documents", "folder_id=none&q=保険").title).toBe("未分類");
    expect(screen("documents", "q=保険").title).toBe("「保険」の検索結果");
    expect(screen("documents").title).toBe("最近追加した書類");
  });

  it("書類一覧の絞り込み条件はクエリを組み合わせて保持する", () => {
    expect(screen("documents", "expiring_within=30&folder_id=none&q=+保険+").params).toEqual({
      q: "保険",
      expiringWithin: 30,
      unclassified: true,
    });
  });

  it("不正・空の expiring_within は無視する", () => {
    expect(screen("documents", "expiring_within=").params?.expiringWithin).toBeUndefined();
    expect(screen("documents", "expiring_within=-1").params?.expiringWithin).toBeUndefined();
    expect(screen("documents", "expiring_within=abc").params?.expiringWithin).toBeUndefined();
  });

  it("検索は語が空なら一覧を出さず、語があればタイトル検索にする", () => {
    expect(screen("search")).toMatchObject({ title: "検索", params: null, search: { query: "" } });
    expect(screen("search", "q=%20車検%20")).toMatchObject({
      title: "「車検」の検索結果",
      params: { q: "車検", unclassified: false },
      search: { query: "車検" },
    });
  });
});
