import { FileQuestion } from "lucide-react";
import Link from "next/link";

// 404。存在しない URL や notFound() 呼び出し(書類/フォルダ詳細)がここに落ちる。
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <FileQuestion className="size-7" />
      </span>
      <div>
        <h1 className="text-lg font-semibold text-gray-900">ページが見つかりません</h1>
        <p className="mt-1 text-sm text-gray-500">
          お探しの書類やフォルダは、移動または削除された可能性があります。
        </p>
      </div>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
      >
        ホームに戻る
      </Link>
    </div>
  );
}
