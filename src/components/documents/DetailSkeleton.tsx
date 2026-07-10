import { Skeleton } from "@/components/ui/Skeleton";

// 書類詳細の遷移待ちスケルトン。DocumentDetail のレイアウト(max-w-2xl)に合わせる。
export function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="size-8 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="size-9 rounded-lg" />
      </div>

      <div className="flex items-start gap-3">
        <Skeleton className="mt-0.5 size-7 rounded-md" />
        <Skeleton className="h-6 w-2/3" />
      </div>

      <div className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3.5">
            <Skeleton className="h-4 w-20 shrink-0" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>

      <Skeleton className="mt-3 h-3 w-52" />
    </div>
  );
}
