import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { createUploadUrl, presignSchema } from "@/server/uploads";

// POST /api/uploads/presign — アップロード用の署名付き PUT URL と s3_key を発行
export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const parsed = presignSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await createUploadUrl(parsed.data));
  } catch (e) {
    return toErrorResponse(e);
  }
}
