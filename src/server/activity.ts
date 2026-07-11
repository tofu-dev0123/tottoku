import "server-only";
import { isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, users } from "@/db/schema";
import { type ActivityItem, deriveActivityItems } from "./activity-derive";

export type { ActivityItem, ActivityType } from "./activity-derive";

// 最近の追加/更新(論理削除除外)を新しい順で取得。通知画面用。
export async function getRecentActivity(limit = 20): Promise<ActivityItem[]> {
  const [docRows, userRows] = await Promise.all([
    db
      .select({
        id: documents.id,
        title: documents.title,
        uploadedBy: documents.uploadedBy,
        updatedBy: documents.updatedBy,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(isNull(documents.deletedAt)),
    db.select({ id: users.id, displayName: users.displayName }).from(users),
  ]);

  const nameById = new Map(userRows.map((u) => [u.id, u.displayName]));
  return deriveActivityItems(docRows, nameById, limit);
}
