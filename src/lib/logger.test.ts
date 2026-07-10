import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, maskEmail } from "./logger";

describe("logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("info を JSON 1 行で level/msg/time と context 付きで出力する", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("documents.create", { documentId: "doc_1", userId: "u_1" });

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({
      level: "info",
      msg: "documents.create",
      documentId: "doc_1",
      userId: "u_1",
    });
    expect(typeof parsed.time).toBe("string");
    expect(Number.isNaN(Date.parse(parsed.time))).toBe(false);
  });

  it("error は console.error に出す", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("unexpected");

    expect(spy).toHaveBeenCalledOnce();
    expect(JSON.parse(spy.mock.calls[0][0] as string).level).toBe("error");
  });

  it("warn は console.warn に出す", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logger.warn("unauthorized", { userId: "u_1" });

    expect(spy).toHaveBeenCalledOnce();
    expect(JSON.parse(spy.mock.calls[0][0] as string).level).toBe("warn");
  });
});

describe("maskEmail", () => {
  it("先頭 1 文字とドメインだけ残す", () => {
    expect(maskEmail("taro@example.com")).toBe("t***@example.com");
  });

  it("@ が無い・先頭が @ の不正入力は *** を返す", () => {
    expect(maskEmail("noat")).toBe("***");
    expect(maskEmail("@x")).toBe("***");
  });
});
