import { daysUntil } from "@/lib/date";

// 期限バッジ。期限切れ=赤、14日以内=赤、それ以外(60日など)=アンバー、無しは "—"。
export function ExpiryPill({ expiryDate, today }: { expiryDate: string | null; today: string }) {
  if (!expiryDate) return <span className="text-gray-400">—</span>;
  const left = daysUntil(expiryDate, today);
  if (left < 0) {
    return (
      <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        期限切れ
      </span>
    );
  }
  const urgent = left <= 14;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      あと{left}日
    </span>
  );
}
