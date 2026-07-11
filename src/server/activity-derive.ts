// アクティビティ(最近の追加/更新)の派生ロジック。DB 非依存の純関数として切り出し、
// ユニットテスト可能にする(副作用は activity.ts 側)。設計は docs/api/dashboard.md「GET /api/activity」。

export type ActivityType = "created" | "updated";

// 「妻が○○を追加/更新しました」通知用の1件。イベント履歴テーブルは持たず
// documents の uploaded_by/updated_by と created_at/updated_at から導く派生ビュー(決定#3)。
export type ActivityItem = {
  type: ActivityType;
  document: { id: string; title: string };
  actor: { id: string; displayName: string };
  /** ISO 8601 */
  at: string;
};

export type ActivityDocRow = {
  id: string;
  title: string;
  uploadedBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// 書類行を「追加/更新」イベントへ展開し、発生時刻の降順で上位 limit 件を返す。
// 追加イベントは常に1件、更新イベントは updated_by が設定され created_at より後の場合のみ。
export function deriveActivityItems(
  docs: ActivityDocRow[],
  nameById: Map<string, string>,
  limit: number,
): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const d of docs) {
    items.push({
      type: "created",
      document: { id: d.id, title: d.title },
      actor: { id: d.uploadedBy, displayName: nameById.get(d.uploadedBy) ?? "" },
      at: d.createdAt.toISOString(),
    });
    if (d.updatedBy && d.updatedAt.getTime() > d.createdAt.getTime()) {
      items.push({
        type: "updated",
        document: { id: d.id, title: d.title },
        actor: { id: d.updatedBy, displayName: nameById.get(d.updatedBy) ?? "" },
        at: d.updatedAt.toISOString(),
      });
    }
  }
  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return items.slice(0, limit);
}
