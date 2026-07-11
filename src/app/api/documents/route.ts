import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import {
  createDocuments,
  createDocumentsSchema,
  listDocuments,
  listQuerySchema,
} from "@/server/documents";

// GET /api/documents — 一覧(絞り込み・検索・カーソルページング)
export async function GET(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  // 空文字のクエリは未指定扱いにする(?q=&sort=... で 400 にしない)。
  const sp = new URL(req.url).searchParams;
  const raw = Object.fromEntries([...sp.entries()].filter(([, v]) => v !== ""));
  const parsed = listQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await listDocuments(parsed.data));
  } catch (e) {
    return toErrorResponse(e);
  }
}

// POST /api/documents — メタデータの一括登録(S3 へ上げた後)。
// 部分成功を許容し、1 件ごとの成否を results で返す。
export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const parsed = createDocumentsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await createDocuments(parsed.data, user.id));
  } catch (e) {
    return toErrorResponse(e);
  }
}
