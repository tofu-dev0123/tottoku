"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useState } from "react";

// 画面0: ログイン。Google ログインのみ。allowlist で家族だけが入れる。
// デザインは docs/screens.html の画面0 に準拠。
export default function LoginPage() {
  // Google へのリダイレクト待ちの間、ボタンに pending 表示を出し二重押しを防ぐ。
  const [pending, setPending] = useState(false);

  async function login() {
    if (pending) return;
    setPending(true);
    try {
      await signIn("google", { redirectTo: "/" });
    } catch {
      // リダイレクトに失敗したら再度押せるように戻す。
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="px-7 pt-11 pb-8 text-center">
          <Image
            src="/tottoku.png"
            alt="とっとく"
            width={745}
            height={280}
            priority
            className="mx-auto h-auto w-44 select-none"
          />
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            家族の大事な書類を、
            <br />
            大切にとっておく。
          </p>
        </div>

        <div className="px-7 pb-5">
          <button
            type="button"
            onClick={login}
            disabled={pending}
            aria-busy={pending}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70"
          >
            {pending ? (
              <>
                <Loader2 className="size-[18px] animate-spin text-gray-500" />
                リダイレクト中…
              </>
            ) : (
              <>
                <GoogleIcon />
                Google でログイン
              </>
            )}
          </button>
          <p className="mt-3.5 text-center text-[11px] leading-relaxed text-gray-400">
            登録された家族だけがログインできます
          </p>
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-7 py-4">
          <p className="text-center text-[11px] leading-relaxed text-gray-500">
            書類は暗号化して保管され、家族以外はアクセスできません
          </p>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
