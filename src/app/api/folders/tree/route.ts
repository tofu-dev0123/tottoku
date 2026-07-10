import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getFolderTree } from "@/server/folders";

// GET /api/folders/tree — 全フォルダの階層ツリー
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  return NextResponse.json(await getFolderTree());
}
