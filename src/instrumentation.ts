// サーバ起動時に一度だけ走る(Next.js の instrumentation フック)。
// どの DB ドライバで動いているかを起動ログに出す。
export async function register() {
  // Node ランタイムでのみ(edge との二重出力を避ける)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("@/lib/env");
    const { logger } = await import("@/lib/logger");
    logger.info("startup", {
      dbDriver: env.DB_DRIVER,
      nodeEnv: process.env.NODE_ENV,
    });
  }
}
