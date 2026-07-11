import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// proxy は edge で動くため、DB を含まない authConfig だけで認証状態を判定する。
const { auth } = NextAuth(authConfig);

// 全ルートを認証必須にする(Next 16 の proxy 規約)。
// 未ログインは API→401 / ページ→/login へリダイレクト。
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  // Auth.js 自身のエンドポイント・ログインページ・公開ランディングページ(/lp)は素通し
  if (pathname.startsWith("/api/auth") || pathname === "/login" || pathname.startsWith("/lp")) {
    return;
  }

  if (!isLoggedIn) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  return;
});

// 静的アセット等は除外
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
