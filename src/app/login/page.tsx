"use client";

import { signIn } from "next-auth/react";

// 画面0: ログイン。Google ログインのみ。allowlist で家族だけが入れる。
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">トットク</h1>
          <p className="text-sm text-gray-500">家族だけがログインできます</p>
        </div>
        <button
          type="button"
          onClick={() => signIn("google", { redirectTo: "/" })}
          className="w-full rounded-md border border-gray-300 px-4 py-2 font-medium transition-colors hover:bg-gray-50"
        >
          Google でログイン
        </button>
      </div>
    </main>
  );
}
