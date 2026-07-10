import { Clock, Folder, History, Home, Inbox, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { FilerCounts, FilerFolder } from "@/server/filer";
import { LogoutButton } from "./LogoutButton";

// アクティブなサイドバー項目。フォルダは folderId を渡す。
export type SidebarKey = "home" | "expiring" | "unclassified" | "recent" | (string & {});

// PC ファイラーの左サイドバー。DesktopFiler と書類一覧/検索ページで共有する。
export function FilerSidebar({
  displayName,
  email,
  sidebarFolders,
  counts,
  activeKey,
}: {
  displayName: string;
  email: string | null;
  sidebarFolders: FilerFolder[];
  counts: FilerCounts;
  activeKey: SidebarKey;
}) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-[#f1f2f4] p-3">
      <div className="px-2 py-2">
        <Image
          src="/tottoku-gray.png"
          alt="とっとく"
          width={751}
          height={283}
          className="h-8 w-auto"
        />
      </div>

      <p className="px-2 pt-3 pb-1 text-[11px] font-semibold text-gray-400">よく使う項目</p>
      <nav className="space-y-0.5">
        <SideItem
          icon={<Home className="size-4" />}
          label="ホーム"
          href="/"
          active={activeKey === "home"}
        />
        <SideItem
          icon={<Clock className="size-4" />}
          label="期限が近い"
          href="/documents?expiring_within=30"
          badge={counts.expiringSoon}
          badgeAmber
          active={activeKey === "expiring"}
        />
        <SideItem
          icon={<Inbox className="size-4" />}
          label="未分類"
          href="/documents?folder_id=none"
          badge={counts.unclassified}
          active={activeKey === "unclassified"}
        />
        <SideItem
          icon={<History className="size-4" />}
          label="最近追加"
          href="/documents"
          active={activeKey === "recent"}
        />
      </nav>

      <p className="px-2 pt-4 pb-1 text-[11px] font-semibold text-gray-400">フォルダ</p>
      <nav className="space-y-0.5 overflow-auto">
        {sidebarFolders.map((f) => (
          <SideItem
            key={f.id}
            icon={<Folder className="size-4" />}
            label={f.name}
            href={`/folders/${f.id}`}
            active={activeKey === f.id}
          />
        ))}
      </nav>

      <div className="mt-auto border-t border-gray-200 pt-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <User className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{displayName || "ユーザー"}</p>
            {email && <p className="truncate text-[11px] text-gray-400">{email}</p>}
          </div>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}

function SideItem({
  icon,
  label,
  href,
  active,
  badge,
  badgeAmber,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
  badge?: number;
  badgeAmber?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
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
