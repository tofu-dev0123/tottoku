import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { presignDownload } from "@/lib/s3";
import { requireUser } from "@/lib/session";
import { getDocumentForDownload } from "@/server/documents";

// GET /api/documents/:id/download — ダウンロード用の短命な署名付き GET URL を発行
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  try {
    const doc = await getDocumentForDownload(id);
    const downloadUrl = await presignDownload(doc.s3Key);
    return NextResponse.json({ download_url: downloadUrl });
  } catch (e) {
    return toErrorResponse(e);
  }
}
