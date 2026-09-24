import { describe, expect, it } from "vitest";
import type { BootstrapData, BootstrapDocument } from "@/server/bootstrap";
import {
  childFolders,
  expiringDocuments,
  filerCounts,
  filerDocuments,
  filerView,
} from "./filer-derive";

function doc(p: Partial<BootstrapDocument> & { id: string }): BootstrapDocument {
  return {
    title: p.id,
    mimeType: "application/pdf",
    docDate: null,
    expiryDate: null,
    memo: null,
    folderId: null,
    tagIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...p,
  };
}

// すまい ─ ほけん
// くるま
const data: BootstrapData = {
  folders: [
    { id: "home", name: "すまい", parentId: null },
    { id: "ins", name: "ほけん", parentId: "home" },
    { id: "car", name: "くるま", parentId: null },
  ],
  documents: [
    doc({ id: "d1", folderId: "home", createdAt: "2026-01-02T00:00:00.000Z" }),
    doc({ id: "d2", folderId: "ins", expiryDate: "2026-02-10" }),
    doc({ id: "d3", folderId: null, createdAt: "2026-01-03T00:00:00.000Z" }),
    doc({ id: "d4", folderId: null, createdAt: "2026-01-05T00:00:00.000Z" }),
    doc({ id: "d5", folderId: "car", expiryDate: "2026-01-10" }),
  ],
  tags: [],
};

describe("childFolders", () => {
  it("直下のフォルダを名前順で返し、件数は子孫フォルダの書類も合算する", () => {
    expect(childFolders(data, null)).toEqual([
      { id: "car", name: "くるま", parentId: null, count: 1 },
      { id: "home", name: "すまい", parentId: null, count: 2 },
    ]);
    expect(childFolders(data, "home")).toEqual([
      { id: "ins", name: "ほけん", parentId: "home", count: 1 },
    ]);
  });
});

describe("filerDocuments", () => {
  it("ルートはどのフォルダにも属さない書類を追加日の降順で返す", () => {
    expect(filerDocuments(data, null).map((d) => d.id)).toEqual(["d4", "d3"]);
  });

  it("フォルダ指定時は直下の書類だけを返し、所属フォルダ名を付ける", () => {
    const docs = filerDocuments(data, "home");
    expect(docs.map((d) => d.id)).toEqual(["d1"]);
    expect(docs[0].folderNames).toEqual(["すまい"]);
    expect(docs[0].createdAt).toEqual(new Date("2026-01-02T00:00:00.000Z"));
  });
});

describe("filerView", () => {
  it("パンくずはルートから現在フォルダまでを並べる", () => {
    expect(filerView(data, "ins")?.breadcrumb).toEqual([
      { id: null, name: "わが家の書類" },
      { id: "home", name: "すまい" },
      { id: "ins", name: "ほけん" },
    ]);
  });

  it("存在しないフォルダは null になる", () => {
    expect(filerView(data, "missing")).toBeNull();
  });
});

describe("filerCounts", () => {
  it("総数・30日以内の期限・未分類を数える", () => {
    expect(filerCounts(data, "2026-01-12")).toEqual({
      total: 5,
      expiringSoon: 1, // d2(2026-02-10)。d5 は期限切れ
      unclassified: 2,
    });
  });

  it("期限ちょうど30日後は含み、31日後は含まない", () => {
    expect(filerCounts(data, "2026-01-11").expiringSoon).toBe(1);
    expect(filerCounts(data, "2026-01-10").expiringSoon).toBe(1); // d5 当日を含む
    expect(filerCounts(data, "2026-01-09").expiringSoon).toBe(1); // d2 は 32日後
  });
});

describe("expiringDocuments", () => {
  it("今日以降の期限を昇順で返し、件数上限で切る", () => {
    expect(expiringDocuments(data, "2026-01-01").map((d) => d.id)).toEqual(["d5", "d2"]);
    expect(expiringDocuments(data, "2026-01-11").map((d) => d.id)).toEqual(["d2"]);
    expect(expiringDocuments(data, "2026-01-01", 1).map((d) => d.id)).toEqual(["d5"]);
  });
});
