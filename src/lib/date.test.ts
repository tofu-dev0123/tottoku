import { describe, expect, it } from "vitest";
import { daysUntil } from "./date";

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
