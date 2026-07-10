// allowlist の純粋ロジック。env や DB に依存させず、単体テスト可能に保つ。

/** カンマ区切りの許可メール文字列を、正規化(トリム・小文字・重複除去)した配列にする。 */
export function parseAllowedEmails(raw: string): string[] {
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  return [...new Set(list)];
}

/** email が allowlist に含まれるか。email が無い・空なら false。 */
export function isAllowedEmail(email: string | null | undefined, allowed: string[]): boolean {
  if (!email) return false;
  return allowed.includes(email.trim().toLowerCase());
}
