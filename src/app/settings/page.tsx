import { Avatar } from "@/components/Avatar";
import { BottomNav } from "@/components/BottomNav";
import { LogoutButton } from "@/components/home/LogoutButton";
import { auth } from "@/lib/auth";

// 設定。モバイルのログアウト導線を兼ねる(PC はサイドバーにログアウトがある)。
export default async function SettingsPage() {
  const session = await auth();
  const displayName = session?.user?.displayName ?? "";
  const email = session?.user?.email ?? null;
  const image = session?.user?.image ?? null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-gray-50 pb-24">
      <header className="flex items-center border-b border-gray-200 bg-white px-5 py-4">
        <p className="text-lg font-medium">設定</p>
      </header>

      <div className="p-4">
        <p className="px-1 pb-1 text-[11px] font-semibold text-gray-400">アカウント</p>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <Avatar
            image={image}
            name={displayName}
            px={40}
            sizeClassName="size-10"
            iconClassName="size-5"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{displayName || "ユーザー"}</p>
            {email && <p className="truncate text-xs text-gray-400">{email}</p>}
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-1">
          <LogoutButton />
        </div>
      </div>

      <BottomNav active="settings" />
    </div>
  );
}
