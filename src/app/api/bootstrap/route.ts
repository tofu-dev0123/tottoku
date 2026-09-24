import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getBootstrapData } from "@/server/bootstrap";

// GET /api/bootstrap — クライアントストア用の全メタデータ(フォルダ・書類・タグ)
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  return NextResponse.json(await getBootstrapData());
}
