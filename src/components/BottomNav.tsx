import { Bell, Camera, Folder, Home, Settings } from "lucide-react";
import Link from "next/link";

type Tab = "home" | "folders" | "notifications" | "settings";

// 下部タブバー(モバイル)。ホーム/フォルダ/追加/通知/設定へ遷移する。
export function BottomNav({ active }: { active: Tab }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-md items-end justify-around border-t border-gray-200 bg-white px-2 pt-2 pb-2">
      <NavItem
        href="/"
        label="ホーム"
        icon={<Home className="size-5" />}
        active={active === "home"}
      />
      <NavItem
        href="/folders"
        label="フォルダ"
        icon={<Folder className="size-5" />}
        active={active === "folders"}
      />
      <Link
        href="/documents/new"
        className="flex flex-col items-center text-gray-500 transition-transform active:scale-95"
      >
        <span className="-mt-6 flex size-12 items-center justify-center rounded-full bg-blue-700 text-white shadow-md ring-4 ring-gray-50">
          <Camera className="size-6" />
        </span>
        <span className="mt-0.5 text-[10px]">追加</span>
      </Link>
      <NavItem
        href="/notifications"
        label="通知"
        icon={<Bell className="size-5" />}
        active={active === "notifications"}
      />
      <NavItem
        href="/settings"
        label="設定"
        icon={<Settings className="size-5" />}
        active={active === "settings"}
      />
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 transition-opacity active:opacity-60 ${active ? "text-blue-700" : "text-gray-400"}`}
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </Link>
  );
}
