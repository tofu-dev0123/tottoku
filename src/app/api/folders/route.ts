import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { createFolder, createFolderSchema, listFolders } from "@/server/folders";

// GET /api/folders?parent_id=<uuid> — 直下のフォルダ(省略時トップ階層)
export async function GET(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const parentId = new URL(req.url).searchParams.get("parent_id");
  const items = await listFolders(parentId && parentId.length > 0 ? parentId : null);
  return NextResponse.json({ items });
}

// POST /api/folders — 作成 { name, parent_id? }
export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const parsed = createFolderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid" },
      { status: 400 },
    );
  }
  try {
    const folder = await createFolder(parsed.data, user.id);
    return NextResponse.json(folder, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
