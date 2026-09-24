"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type SidebarKey, sidebarActiveKey } from "./sidebar-active-key";

// サイドバー項目。共通レイアウトで再描画されないため、アクティブ状態は URL から判定する。
export function SidebarLink({
  itemKey,
  icon,
  label,
  href,
  badge,
  badgeAmber,
}: {
  itemKey: SidebarKey;
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
  badgeAmber?: boolean;
}) {
  const active = sidebarActiveKey(usePathname(), useSearchParams()) === itemKey;

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors active:bg-gray-200 ${
        active ? "bg-blue-100 text-blue-800" : "text-gray-700 hover:bg-gray-200/60"
      }`}
    >
      <span className="text-blue-700">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span
          className={`min-w-5 rounded-full px-1.5 text-center text-[11px] text-white ${
            badgeAmber ? "bg-amber-500" : "bg-gray-400"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
