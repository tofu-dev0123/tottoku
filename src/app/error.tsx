"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

// ルート全体のエラーバウンダリ。想定外の例外時に白画面ではなく復帰導線を出す。
// 機微情報は表示しない(logging.md 準拠)。詳細は digest のみコンソールへ。
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error.digest ?? "unhandled error");
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="size-7" />
      </span>
      <div>
        <h1 className="text-lg font-semibold text-gray-900">問題が発生しました</h1>
        <p className="mt-1 text-sm text-gray-500">時間をおいて、もう一度お試しください。</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          再試行
        </button>
        <Link
          href="/"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
