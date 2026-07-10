import { describe, expect, it } from "vitest";
import { addDays, daysUntil } from "./date";

describe("addDays", () => {
  it("n 日後を返す", () => {
    expect(addDays("2026-07-09", 30)).toBe("2026-08-08");
  });
  it("月をまたぐ", () => {
    expect(addDays("2026-07-25", 10)).toBe("2026-08-04");
  });
});

describe("daysUntil", () => {
  it("将来の日付は正の日数", () => {
    expect(daysUntil("2026-07-17", "2026-07-09")).toBe(8);
  });

  it("同日は 0", () => {
    expect(daysUntil("2026-07-09", "2026-07-09")).toBe(0);
  });

  it("過去の日付は負の日数", () => {
    expect(daysUntil("2026-07-01", "2026-07-09")).toBe(-8);
  });

  it("月をまたいでも正しく数える", () => {
    expect(daysUntil("2026-08-01", "2026-07-09")).toBe(23);
  });
});
