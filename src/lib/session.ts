import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export type SessionUser = { id: string; displayName: string; email?: string | null };

/** ログイン中なら user(内部id付き)、未ログインなら null。 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    displayName: session.user.displayName,
    email: session.user.email,
  };
}

/** 401 の共通レスポンス(エラー形は { error } で統一)。 */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

/**
 * Route Handler 冒頭で使う。ログイン済みなら user、未ログインなら 401 Response を返す。
 * 使い方:
 *   const auth = await requireUser();
 *   if (auth instanceof NextResponse) return auth;
 *   // auth はここで SessionUser
 */
export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  return user ?? unauthorized();
}
