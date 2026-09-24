import { Clock, Folder, History, Home, Inbox } from "lucide-react";
import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import type { FilerCounts, FilerFolder } from "@/lib/filer-derive";
import { LogoutButton } from "./LogoutButton";
import { SidebarLink } from "./SidebarLink";

// PC ファイラーの左サイドバー。(filer) 共通レイアウトに置き、画面遷移をまたいで保持する。
export function FilerSidebar({
  displayName,
  email,
  image,
  sidebarFolders,
  counts,
}: {
  displayName: string;
  email: string | null;
  image?: string | null;
  sidebarFolders: FilerFolder[];
  counts: FilerCounts;
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
        <SidebarLink itemKey="home" icon={<Home className="size-4" />} label="ホーム" href="/" />
        <SidebarLink
          itemKey="expiring"
          icon={<Clock className="size-4" />}
          label="期限が近い"
          href="/documents?expiring_within=30"
          badge={counts.expiringSoon}
          badgeAmber
        />
        <SidebarLink
          itemKey="unclassified"
          icon={<Inbox className="size-4" />}
          label="未分類"
          href="/documents?folder_id=none"
          badge={counts.unclassified}
        />
        <SidebarLink
          itemKey="recent"
          icon={<History className="size-4" />}
          label="最近追加"
          href="/documents"
        />
      </nav>

      <p className="px-2 pt-4 pb-1 text-[11px] font-semibold text-gray-400">フォルダ</p>
      <nav className="space-y-0.5 overflow-auto">
        {sidebarFolders.map((f) => (
          <SidebarLink
            key={f.id}
            itemKey={f.id}
            icon={<Folder className="size-4" />}
            label={f.name}
            href={`/folders/${f.id}`}
          />
        ))}
      </nav>

      <div className="mt-auto border-t border-gray-200 pt-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar
            image={image}
            name={displayName}
            px={28}
            sizeClassName="size-7"
            iconClassName="size-4"
          />
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
