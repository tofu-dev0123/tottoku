import { describe, expect, it } from "vitest";
import type { BootstrapData, BootstrapDocument } from "@/server/bootstrap";
import {
  childFolders,
  documentDetail,
  documentList,
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
    uploadedBy: "u1",
    updatedBy: null,
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
    doc({
      id: "d2",
      folderId: "ins",
      expiryDate: "2026-02-10",
      tagIds: ["t2", "t1"],
      updatedBy: "u2",
      memo: "年払い",
    }),
    doc({ id: "d3", folderId: null, createdAt: "2026-01-03T00:00:00.000Z" }),
    doc({ id: "d4", folderId: null, createdAt: "2026-01-05T00:00:00.000Z" }),
    doc({ id: "d5", folderId: "car", expiryDate: "2026-01-10" }),
  ],
  tags: [
    { id: "t1", name: "火災" },
    { id: "t2", name: "更新" },
  ],
  users: [
    { id: "u1", displayName: "たろう" },
    { id: "u2", displayName: "はなこ" },
  ],
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

describe("documentList", () => {
  const list = (filter: Parameters<typeof documentList>[1], today = "2026-01-01") =>
    documentList(
      {
        ...data,
        documents: [
          ...data.documents,
          doc({ id: "d6", title: "Car Insurance", createdAt: "2026-01-04T00:00:00.000Z" }),
        ],
      },
      filter,
      today,
    ).map((d) => d.id);

  it("条件なしは全件を追加日の降順で返す", () => {
    expect(list({})).toEqual(["d4", "d6", "d3", "d1", "d2", "d5"]);
  });

  it("q はタイトルの部分一致で大文字小文字を区別しない", () => {
    expect(list({ q: "insur" })).toEqual(["d6"]);
  });

  it("未分類はどのフォルダにも属さない書類だけを返す", () => {
    expect(list({ unclassified: true })).toEqual(["d4", "d6", "d3"]);
  });

  it("expiringWithin は 今日〜n日後 を期限の昇順で返す", () => {
    expect(list({ expiringWithin: 60 })).toEqual(["d5", "d2"]);
    expect(list({ expiringWithin: 9 })).toEqual(["d5"]); // 2026-01-10 ちょうど
    expect(list({ expiringWithin: 60 }, "2026-01-11")).toEqual(["d2"]); // 期限切れは除外
  });

  it("条件は AND で組み合わせる", () => {
    expect(list({ q: "d", unclassified: true })).toEqual(["d4", "d3"]);
    expect(list({ expiringWithin: 60, unclassified: true })).toEqual([]);
  });
});

describe("documentDetail", () => {
  it("所属フォルダ・タグ名・追加者/更新者の表示名を組み立てる", () => {
    expect(documentDetail(data, "d2")).toEqual({
      id: "d2",
      title: "d2",
      mime_type: "application/pdf",
      doc_date: null,
      expiry_date: "2026-02-10",
      memo: "年払い",
      folders: [{ id: "ins", name: "ほけん" }],
      tags: ["更新", "火災"],
      uploaded_by: { id: "u1", displayName: "たろう" },
      updated_by: { id: "u2", displayName: "はなこ" },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
  });

  it("未分類・未更新の書類はフォルダ空・updated_by null になる", () => {
    const d = documentDetail(data, "d3");
    expect(d?.folders).toEqual([]);
    expect(d?.updated_by).toBeNull();
  });

  it("存在しない書類は null になる", () => {
    expect(documentDetail(data, "missing")).toBeNull();
  });
});
