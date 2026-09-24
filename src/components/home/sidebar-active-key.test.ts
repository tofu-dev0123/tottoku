import { describe, expect, it } from "vitest";
import { sidebarActiveKey } from "./sidebar-active-key";

const key = (pathname: string, query = "") =>
  sidebarActiveKey(pathname, new URLSearchParams(query));

describe("sidebarActiveKey", () => {
  it("ホームとフォルダのルートは home になる", () => {
    expect(key("/")).toBe("home");
    expect(key("/folders")).toBe("home");
  });

  it("フォルダ詳細はフォルダ id になる", () => {
    expect(key("/folders/abc-123")).toBe("abc-123");
  });

  it("書類一覧はクエリに応じて期限/未分類/最近追加になる", () => {
    expect(key("/documents", "expiring_within=30")).toBe("expiring");
    expect(key("/documents", "folder_id=none")).toBe("unclassified");
    expect(key("/documents")).toBe("recent");
  });

  it("expiring_within が不正な値なら期限扱いしない", () => {
    expect(key("/documents", "expiring_within=abc")).toBe("recent");
    expect(key("/documents", "expiring_within=-1")).toBe("recent");
    expect(key("/documents", "expiring_within=")).toBe("recent");
  });

  it("書類一覧の検索と検索ページはどれもアクティブにしない", () => {
    expect(key("/documents", "q=保険")).toBe("");
    expect(key("/search", "q=保険")).toBe("");
  });
});
