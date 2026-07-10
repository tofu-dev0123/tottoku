import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="mt-5 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-5 ml-auto h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}
