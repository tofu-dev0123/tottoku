import { describe, expect, it } from "vitest";
import type { BootstrapData, BootstrapDocument } from "@/server/bootstrap";
import {
  createFolder,
  deleteDocument,
  deleteFolder,
  folderDeletionImpact,
  folderMoveError,
  hasFolderNameConflict,
  moveFolder,
  renameFolder,
  updateDocument,
} from "./store-updates";

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

// すまい ─ ほけん ─ かさい
// くるま
const data: BootstrapData = {
  folders: [
    { id: "home", name: "すまい", parentId: null },
    { id: "ins", name: "ほけん", parentId: "home" },
    { id: "fire", name: "かさい", parentId: "ins" },
    { id: "car", name: "くるま", parentId: null },
  ],
  documents: [
    doc({ id: "d1", folderId: "home" }),
    doc({ id: "d2", folderId: "fire", tagIds: ["t1"] }),
    doc({ id: "d3", folderId: "car" }),
    doc({ id: "d4" }),
  ],
  tags: [{ id: "t1", name: "火災" }],
  users: [{ id: "u1", displayName: "たろう" }],
};

describe("hasFolderNameConflict", () => {
  it("同じ階層の同名だけを衝突とみなす(前後の空白は無視)", () => {
    expect(hasFolderNameConflict(data, null, " くるま ")).toBe(true);
    expect(hasFolderNameConflict(data, "home", "くるま")).toBe(false);
  });

  it("名前変更では自分自身を除外する", () => {
    expect(hasFolderNameConflict(data, null, "くるま", "car")).toBe(false);
  });
});

describe("folderMoveError", () => {
  it("自分自身・子孫への移動は理由を返す", () => {
    expect(folderMoveError(data, "home", "home")).toBe("自分自身を親にできません");
    expect(folderMoveError(data, "home", "fire")).toBe("自分の子孫フォルダには移動できません");
  });

  it("移動先に同名があれば理由を返し、問題なければ null", () => {
    const withDup = createFolder(data, { id: "x", name: "ほけん", parentId: "car" });
    expect(folderMoveError(withDup, "ins", "car")).toBe("移動先に同名のフォルダがあります");
    expect(folderMoveError(data, "ins", "car")).toBeNull();
    expect(folderMoveError(data, "ins", null)).toBeNull();
  });
});

describe("folderDeletionImpact", () => {
  it("子孫フォルダ数とサブツリー内の書類数を返す", () => {
    expect(folderDeletionImpact(data, "home")).toEqual({
      descendantFolderCount: 2,
      documentCount: 2,
    });
    expect(folderDeletionImpact(data, "car")).toEqual({
      descendantFolderCount: 0,
      documentCount: 1,
    });
  });
});

describe("フォルダの楽観的更新", () => {
  it("作成・名前変更・移動を反映し、元データは変更しない", () => {
    const created = createFolder(data, { id: "new", name: " 車検 ", parentId: "car" });
    expect(created.folders.at(-1)).toEqual({ id: "new", name: "車検", parentId: "car" });
    expect(renameFolder(data, "car", "くるま2").folders.find((f) => f.id === "car")?.name).toBe(
      "くるま2",
    );
    expect(moveFolder(data, "ins", null).folders.find((f) => f.id === "ins")?.parentId).toBeNull();
    expect(data.folders).toHaveLength(4);
  });

  it("削除は子孫ごと消し、所属していた書類を未分類にする", () => {
    const next = deleteFolder(data, "ins");
    expect(next.folders.map((f) => f.id)).toEqual(["home", "car"]);
    expect(next.documents.find((d) => d.id === "d2")?.folderId).toBeNull();
    expect(next.documents.find((d) => d.id === "d1")?.folderId).toBe("home");
  });
});

describe("書類の楽観的更新", () => {
  const meta = { userId: "u1", now: "2026-02-01T00:00:00.000Z" };

  it("指定した項目だけを更新し、更新者・更新日時を付ける", () => {
    const next = updateDocument(data, "d4", { title: " 新名 ", folderId: "car" }, meta);
    expect(next.documents.find((d) => d.id === "d4")).toMatchObject({
      title: "新名",
      folderId: "car",
      memo: null,
      updatedBy: "u1",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
  });

  it("タグは既存名を再利用し、未知の名前だけ仮 id で足す", () => {
    const next = updateDocument(data, "d2", { tagNames: ["火災", "更新"] }, meta);
    expect(next.tags).toEqual([
      { id: "t1", name: "火災" },
      { id: "pending:更新", name: "更新" },
    ]);
    expect(next.documents.find((d) => d.id === "d2")?.tagIds).toEqual(["t1", "pending:更新"]);
  });

  it("削除は一覧から除く", () => {
    expect(deleteDocument(data, "d1").documents.map((d) => d.id)).toEqual(["d2", "d3", "d4"]);
  });
});
