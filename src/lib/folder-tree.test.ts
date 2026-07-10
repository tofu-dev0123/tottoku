import { describe, expect, it } from "vitest";
import { buildBreadcrumb, buildTree, canMove, collectDescendantIds } from "./folder-tree";
import type { FolderRow } from "./folder-tree";

// 契約 / 保険>(自動車,火災) / 長男
const folders: FolderRow[] = [
  { id: "keiyaku", name: "契約", parentId: null },
  { id: "hoken", name: "保険", parentId: null },
  { id: "car", name: "自動車", parentId: "hoken" },
  { id: "fire", name: "火災", parentId: "hoken" },
  { id: "son", name: "長男", parentId: null },
];

describe("buildTree", () => {
  it("トップ階層と子をネストして返す", () => {
    const tree = buildTree(folders);
    const hoken = tree.find((n) => n.id === "hoken")!;
    expect(tree.map((n) => n.id)).toContain("hoken");
    expect(hoken.children.map((c) => c.name)).toEqual(
      ["火災", "自動車"].sort((a, b) => a.localeCompare(b, "ja")),
    );
  });
});

describe("collectDescendantIds", () => {
  it("子孫を全て集める(自身は含まない)", () => {
    expect(collectDescendantIds(folders, "hoken")).toEqual(new Set(["car", "fire"]));
  });
  it("子が無ければ空", () => {
    expect(collectDescendantIds(folders, "car")).toEqual(new Set());
  });
});

describe("buildBreadcrumb", () => {
  it("ルートから対象までを返す", () => {
    expect(buildBreadcrumb(folders, "car")).toEqual([
      { id: "hoken", name: "保険" },
      { id: "car", name: "自動車" },
    ]);
  });
});

describe("canMove", () => {
  it("トップ階層(null)へは移動可", () => {
    expect(canMove(folders, "car", null).ok).toBe(true);
  });
  it("別の枝へは移動可", () => {
    expect(canMove(folders, "car", "keiyaku").ok).toBe(true);
  });
  it("自分自身は不可", () => {
    expect(canMove(folders, "hoken", "hoken").ok).toBe(false);
  });
  it("自分の子孫へは不可", () => {
    expect(canMove(folders, "hoken", "car").ok).toBe(false);
  });
  it("存在しない親は不可", () => {
    expect(canMove(folders, "car", "nope").ok).toBe(false);
  });
});
