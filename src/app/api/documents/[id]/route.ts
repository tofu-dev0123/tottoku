import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import {
  getDocumentDetail,
  softDeleteDocument,
  updateDocument,
  updateDocumentSchema,
} from "@/server/documents";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/documents/:id — 詳細(メタ + 所属フォルダ + タグ + 追加者/更新者)
export async function GET(_req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  try {
    return NextResponse.json(await getDocumentDetail(id));
  } catch (e) {
    return toErrorResponse(e);
  }
}

// PATCH /api/documents/:id — 更新(folder_ids / tags は渡されたら全置換)
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const parsed = updateDocumentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await updateDocument(id, parsed.data, user.id));
  } catch (e) {
    return toErrorResponse(e);
  }
}

// DELETE /api/documents/:id — 論理削除
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  try {
    await softDeleteDocument(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
