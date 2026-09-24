import { describe, expect, it } from "vitest";
import { isClientHref, matchClientRoute } from "./client-routes";

describe("matchClientRoute", () => {
  it("ホーム・フォルダのルート・フォルダ詳細に一致する", () => {
    expect(matchClientRoute("/")).toEqual({ kind: "home" });
    expect(matchClientRoute("/folders")).toEqual({ kind: "folders" });
    expect(matchClientRoute("/folders/abc-123")).toEqual({ kind: "folder", id: "abc-123" });
  });

  it("サーバー描画のルートには一致しない", () => {
    expect(matchClientRoute("/documents")).toBeNull();
    expect(matchClientRoute("/documents/abc")).toBeNull();
    expect(matchClientRoute("/search")).toBeNull();
    expect(matchClientRoute("/folders/abc/extra")).toBeNull();
  });
});

describe("isClientHref", () => {
  it("クエリ・ハッシュを除いたパスで判定する", () => {
    expect(isClientHref("/folders/abc?x=1")).toBe(true);
    expect(isClientHref("/#top")).toBe(true);
    expect(isClientHref("/documents?expiring_within=30")).toBe(false);
  });

  it("外部 URL・プロトコル相対 URL は対象外", () => {
    expect(isClientHref("https://example.com/")).toBe(false);
    expect(isClientHref("//example.com/folders")).toBe(false);
  });
});
