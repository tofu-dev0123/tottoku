import { describe, expect, it } from "vitest";
import { type ActivityDocRow, deriveActivityItems } from "./activity-derive";

const names = new Map([
  ["u-husband", "夫"],
  ["u-wife", "妻"],
]);

function doc(over: Partial<ActivityDocRow>): ActivityDocRow {
  return {
    id: "d1",
    title: "書類",
    uploadedBy: "u-wife",
    updatedBy: null,
    createdAt: new Date("2026-07-10T00:00:00.000Z"),
    updatedAt: new Date("2026-07-10T00:00:00.000Z"),
    ...over,
  };
}

describe("deriveActivityItems", () => {
  it("更新が無い書類は追加イベントのみを出す", () => {
    const items = deriveActivityItems([doc({})], names, 20);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: "created", actor: { displayName: "妻" } });
  });

  it("updated_by があり created_at より後なら更新イベントも出す", () => {
    const items = deriveActivityItems(
      [
        doc({
          updatedBy: "u-husband",
          updatedAt: new Date("2026-07-11T09:00:00.000Z"),
        }),
      ],
      names,
      20,
    );
    expect(items.map((i) => i.type)).toEqual(["updated", "created"]);
    expect(items[0].actor.displayName).toBe("夫");
  });

  it("updated_at が created_at と同じなら更新イベントは出さない", () => {
    const items = deriveActivityItems([doc({ updatedBy: "u-husband" })], names, 20);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("created");
  });

  it("発生時刻の降順に並べ、limit で打ち切る", () => {
    const items = deriveActivityItems(
      [
        doc({ id: "old", createdAt: new Date("2026-07-01T00:00:00.000Z") }),
        doc({ id: "new", createdAt: new Date("2026-07-09T00:00:00.000Z") }),
        doc({ id: "mid", createdAt: new Date("2026-07-05T00:00:00.000Z") }),
      ],
      names,
      2,
    );
    expect(items.map((i) => i.document.id)).toEqual(["new", "mid"]);
  });

  it("未知の actor は表示名を空文字にフォールバック", () => {
    const items = deriveActivityItems([doc({ uploadedBy: "u-unknown" })], names, 20);
    expect(items[0].actor.displayName).toBe("");
  });
});
