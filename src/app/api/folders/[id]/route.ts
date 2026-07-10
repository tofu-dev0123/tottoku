import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { deleteFolder, getFolderDetail, updateFolder, updateFolderSchema } from "@/server/folders";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/folders/:id — 詳細(パンくず + 子 + 直下書類)
export async function GET(_req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  try {
    return NextResponse.json(await getFolderDetail(id));
  } catch (e) {
    return toErrorResponse(e);
  }
}

// PATCH /api/folders/:id — リネーム / 移動
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const parsed = updateFolderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await updateFolder(id, parsed.data));
  } catch (e) {
    return toErrorResponse(e);
  }
}

// DELETE /api/folders/:id — 削除(子・紐付けは CASCADE、書類は残る)
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  try {
    await deleteFolder(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
