import { describe, expect, it } from "vitest";
import { isAllowedEmail, parseAllowedEmails } from "./allowlist";

describe("parseAllowedEmails", () => {
  it("トリム・小文字化・空要素除去・重複除去する", () => {
    expect(parseAllowedEmails(" A@x.com , b@x.com ,, A@X.com ")).toEqual(["a@x.com", "b@x.com"]);
  });

  it("空文字は空配列", () => {
    expect(parseAllowedEmails("")).toEqual([]);
  });
});

describe("isAllowedEmail", () => {
  const allowed = ["taro@example.com", "hanako@example.com"];

  it("許可メール(大文字・前後空白を無視)は true", () => {
    expect(isAllowedEmail("taro@example.com", allowed)).toBe(true);
    expect(isAllowedEmail(" Taro@Example.com ", allowed)).toBe(true);
  });

  it("非許可メールは false", () => {
    expect(isAllowedEmail("stranger@example.com", allowed)).toBe(false);
  });

  it("null / undefined / 空は false", () => {
    expect(isAllowedEmail(null, allowed)).toBe(false);
    expect(isAllowedEmail(undefined, allowed)).toBe(false);
    expect(isAllowedEmail("", allowed)).toBe(false);
  });
});
