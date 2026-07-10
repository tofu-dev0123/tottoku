"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: "/login" })}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
    >
      <LogOut className="size-4" />
      ログアウト
    </button>
  );
}
