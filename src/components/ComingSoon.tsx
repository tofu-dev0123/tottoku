import type { LucideIcon } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

// 未実装タブ(通知/設定)の「準備中」プレースホルダ。デッドリンク(404)を解消する。
export function ComingSoon({
  title,
  icon: Icon,
  active,
}: {
  title: string;
  icon: LucideIcon;
  active: "notifications" | "settings";
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-gray-50 pb-24">
      <header className="flex items-center border-b border-gray-200 bg-white px-5 py-4">
        <p className="text-lg font-medium">{title}</p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <Icon className="size-7" />
        </span>
        <div>
          <p className="text-base font-medium text-gray-700">準備中です</p>
          <p className="mt-1 text-sm text-gray-400">この機能は現在開発中です。</p>
        </div>
      </div>

      <BottomNav active={active} />
    </div>
  );
}
