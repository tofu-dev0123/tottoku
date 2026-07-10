// フォルダ階層の純ロジック。DB に依存させず単体テスト可能に保つ。
// (循環参照チェック・パンくず・ツリー構築を担う)

export type FolderRow = { id: string; name: string; parentId: string | null };
export type FolderNode = { id: string; name: string; children: FolderNode[] };

/** 全フォルダから階層ツリー(トップ階層の配列)を組む。名前順。 */
export function buildTree(folders: FolderRow[]): FolderNode[] {
  const byParent = new Map<string | null, FolderRow[]>();
  for (const f of folders) {
    const arr = byParent.get(f.parentId) ?? [];
    arr.push(f);
    byParent.set(f.parentId, arr);
  }
  const build = (parentId: string | null): FolderNode[] =>
    (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "ja"))
      .map((f) => ({ id: f.id, name: f.name, children: build(f.id) }));
  return build(null);
}

/** id の子孫 id 全て(id 自身は含まない)。 */
export function collectDescendantIds(folders: FolderRow[], id: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const f of folders) {
    if (f.parentId) {
      const arr = children.get(f.parentId) ?? [];
      arr.push(f.id);
      children.set(f.parentId, arr);
    }
  }
  const out = new Set<string>();
  const walk = (cur: string) => {
    for (const c of children.get(cur) ?? []) {
      if (!out.has(c)) {
        out.add(c);
        walk(c);
      }
    }
  };
  walk(id);
  return out;
}

/** ルート→id のパンくず配列。id が無ければ空配列。 */
export function buildBreadcrumb(folders: FolderRow[], id: string): { id: string; name: string }[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const chain: { id: string; name: string }[] = [];
  let cur = byId.get(id);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.unshift({ id: cur.id, name: cur.name });
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return chain;
}

/**
 * folder(id) を parentId の下に移動してよいか。
 * NG: 自分自身を親にする / 移動先が自分の子孫 / 親が存在しない。
 */
export function canMove(
  folders: FolderRow[],
  id: string,
  parentId: string | null,
): { ok: true } | { ok: false; reason: string } {
  if (parentId === null) return { ok: true };
  if (parentId === id) return { ok: false, reason: "自分自身を親にできません" };
  if (!folders.some((f) => f.id === parentId)) {
    return { ok: false, reason: "移動先フォルダが存在しません" };
  }
  if (collectDescendantIds(folders, id).has(parentId)) {
    return { ok: false, reason: "自分の子孫フォルダには移動できません" };
  }
  return { ok: true };
}
