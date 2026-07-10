import { AlertCircle, ChevronRight, Clock, User } from "lucide-react";
import Link from "next/link";
import { SearchBox } from "@/components/documents/SearchBox";
import { BottomNav } from "@/components/BottomNav";
import { daysUntil, todayInJST } from "@/lib/date";
import type { ExpiringDocument } from "@/server/dashboard";

// モバイルのホーム(画面1)。期限が近い書類 + 検索窓。PC は DesktopFiler を使う。
export function MobileHome({
  displayName,
  docs,
}: {
  displayName: string;
  docs: ExpiringDocument[];
}) {
  const today = todayInJST();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-gray-50 pb-24">
      <header className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[13px] text-gray-500">おかえりなさい</p>
          <p className="mt-0.5 text-lg font-medium">わが家の書類</p>
        </div>
        <div
          className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-blue-700"
          title={displayName}
        >
          <User className="size-5" />
        </div>
      </header>

      <div className="px-5">
        <SearchBox className="w-full py-3" />
      </div>

      <section className="px-5 pt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">期限が近い書類</span>
          <Link href="/documents?expiring_within=60" className="text-xs text-blue-700">
            すべて見る
          </Link>
        </div>

        {docs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400">
            期限が近い書類はありません
          </p>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => {
              const left = daysUntil(d.expiryDate, today);
              const urgent = left <= 14;
              return (
                <li key={d.id}>
                  <Link
                    href={`/documents/${d.id}`}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                      urgent ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {urgent ? (
                      <AlertCircle className="size-6 shrink-0" />
                    ) : (
                      <Clock className="size-6 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{d.title}</p>
                      <p className="mt-0.5 text-xs">期限まで あと {left}日</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <BottomNav active="home" />
    </div>
  );
}
