import "server-only";
import { and, asc, gte, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { todayInJST } from "@/lib/date";

export type ExpiringDocument = {
  id: string;
  title: string;
  expiryDate: string;
};

// 期限が近い書類(今日以降・論理削除除外)を期限の昇順で取得。ホーム画面用。
export async function getExpiringDocuments(limit = 5): Promise<ExpiringDocument[]> {
  const today = todayInJST();
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      expiryDate: documents.expiryDate,
    })
    .from(documents)
    .where(
      and(
        isNull(documents.deletedAt),
        isNotNull(documents.expiryDate),
        gte(documents.expiryDate, today),
      ),
    )
    .orderBy(asc(documents.expiryDate))
    .limit(limit);

  // isNotNull で絞っているため expiryDate は non-null
  return rows.map((r) => ({ id: r.id, title: r.title, expiryDate: r.expiryDate as string }));
}
