// 日付ユーティリティ。期限判定は JST 基準で行う(docs/db/invariants.md)。

/** 今日の日付を JST の "YYYY-MM-DD" で返す。 */
export function todayInJST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

/** from(YYYY-MM-DD) から target(YYYY-MM-DD) までの日数。純関数。 */
export function daysUntil(target: string, from: string): number {
  const t = Date.parse(`${target}T00:00:00Z`);
  const f = Date.parse(`${from}T00:00:00Z`);
  return Math.round((t - f) / 86_400_000);
}

/** date(YYYY-MM-DD) の n 日後を "YYYY-MM-DD" で返す。純関数。 */
export function addDays(date: string, n: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** timestamptz(Date) を "YYYY/MM/DD"(JST) で表示用に整形。 */
export function formatDateJST(d: Date): string {
  return d.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
