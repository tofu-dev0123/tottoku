// ローディング中のプレースホルダ矩形。実データの遷移待ちに表示する最小単位。
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}
