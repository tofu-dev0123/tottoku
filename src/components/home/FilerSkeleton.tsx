import { Skeleton } from "@/components/ui/Skeleton";

const GRID = "grid grid-cols-[1fr_180px_130px_150px] items-center";

// ファイラー系(ホーム/フォルダ/一覧/検索)の遷移待ちスケルトン。
// 実画面と同じ md:hidden / hidden md:block とコンテナ幅で描き、レイアウトシフトを抑える。
export function FilerSkeleton() {
  return (
    <>
      <div className="md:hidden">
        <MobileListSkeleton />
      </div>
      <div className="hidden md:block">
        <DesktopFilerSkeleton />
      </div>
    </>
  );
}

function MobileListSkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-gray-50 pb-24">
      <header className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <Skeleton className="size-5 rounded-md" />
        <Skeleton className="h-4 w-32" />
      </header>
      <div className="flex-1 px-4 py-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-gray-100 py-3.5">
            <Skeleton className="size-6 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-0 mx-auto flex h-16 w-full max-w-md items-center justify-around border-t border-gray-200 bg-white">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-6 rounded-md" />
        ))}
      </div>
    </div>
  );
}

function DesktopFilerSkeleton() {
  return (
    <div className="flex h-dvh bg-white text-gray-900">
      {/* サイドバー */}
      <aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-gray-200 bg-[#f1f2f4] p-3">
        <Skeleton className="mx-2 my-2 h-8 w-28" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`n${i}`} className="h-8 rounded-lg" />
        ))}
        <Skeleton className="mt-3 h-3 w-16" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={`f${i}`} className="h-8 rounded-lg" />
        ))}
        <div className="mt-auto flex items-center gap-2 border-t border-gray-200 px-2 pt-3">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </aside>

      {/* メイン */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <Skeleton className="h-4 w-40" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="flex-1">
          <div className={`${GRID} border-b border-gray-200 px-5 py-3`}>
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="ml-auto h-3 w-12" />
          </div>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={`${GRID} border-b border-gray-100 px-5 py-3.5`}>
              <span className="flex items-center gap-3">
                <Skeleton className="size-5 rounded-md" />
                <Skeleton className="h-4 w-48" />
              </span>
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="ml-auto h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
