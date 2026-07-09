/**
 * 構造化 JSON ロガー。1 ログ = 1 JSON 行で console へ出力する。
 * Vercel では stdout/stderr がそのままログ基盤に集約されるため、依存ライブラリは持たない。
 *
 * PII / 機微情報（title・memo・s3_key・署名 URL・認証情報など）は context に含めないこと。
 * 詳細は .claude/rules/logging.md を参照。
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// 本番は info 以上のみ出力。NODE_ENV はランタイムが提供する特別な変数のため直接参照する
// （アプリ定義の環境変数は env.ts 経由で扱う — .claude/rules/file-conventions.md）。
const MIN_LEVEL: LogLevel = process.env.NODE_ENV === "production" ? "info" : "debug";

function emit(level: LogLevel, msg: string, context?: LogContext): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[MIN_LEVEL]) return;

  const line = JSON.stringify({
    level,
    msg,
    time: new Date().toISOString(),
    ...context,
  });

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, context?: LogContext) => emit("debug", msg, context),
  info: (msg: string, context?: LogContext) => emit("info", msg, context),
  warn: (msg: string, context?: LogContext) => emit("warn", msg, context),
  error: (msg: string, context?: LogContext) => emit("error", msg, context),
};

/**
 * email を userId で代替できない場面向けにマスクする（例: `taro@example.com` → `t***@example.com`）。
 * 原則はログに email ではなく userId を使うこと。
 */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}
