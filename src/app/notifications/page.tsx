import { BottomNav } from "@/components/BottomNav";
import { NotificationList } from "@/components/notifications/NotificationList";
import { todayInJST } from "@/lib/date";
import { getRecentActivity } from "@/server/activity";
import { getExpiringDocuments } from "@/server/dashboard";

// 認証はミドルウェア(proxy.ts)が全ルートで担保。このページはセッションを使わないため
// 既定では静的プリレンダリングされ DB データが焼き込まれてしまう。毎リクエストで最新を
// 出すよう動的化する(Cache Components 導入時は use cache + タグ無効化へ移行予定)。
export const dynamic = "force-dynamic";

// 通知(画面6)。期限が近い書類 + 最近の追加/更新をまとめて表示する。
export default async function NotificationsPage() {
  const [expiring, activity] = await Promise.all([getExpiringDocuments(20), getRecentActivity()]);
  const today = todayInJST();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-gray-50 pb-24">
      <header className="flex items-center border-b border-gray-200 bg-white px-5 py-4">
        <p className="text-lg font-medium">通知</p>
      </header>

      <NotificationList expiring={expiring} activity={activity} today={today} />

      <BottomNav active="notifications" />
    </div>
  );
}
