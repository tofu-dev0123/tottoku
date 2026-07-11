"use client";

import { AlertCircle, Clock, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { addDays, daysUntil } from "@/lib/date";
import type { ActivityItem } from "@/server/activity-derive";
import type { ExpiringDocument } from "@/server/dashboard";

type Filter = "all" | "expiry" | "activity";

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "expiry", label: "期限" },
  { key: "activity", label: "更新" },
];

// 通知一覧(モバイル)。期限リマインドと最近の更新を、タブで絞り込んで表示する。
// 未読/既読は現状データモデルに無いため扱わない。
export function NotificationList({
  expiring,
  activity,
  today,
}: {
  expiring: ExpiringDocument[];
  activity: ActivityItem[];
  today: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const showExpiry = filter === "all" || filter === "expiry";
  const showActivity = filter === "all" || filter === "activity";
  const isEmpty =
    (!showExpiry || expiring.length === 0) && (!showActivity || activity.length === 0);

  return (
    <>
      <div className="flex gap-2 border-b border-gray-200 bg-white px-5 py-3">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
              filter === t.key ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-3">
        {isEmpty ? (
          <p className="mt-16 text-center text-sm text-gray-400">通知はありません</p>
        ) : (
          <>
            {showExpiry && expiring.length > 0 && (
              <section>
                <p className="px-1 pt-2 pb-1.5 text-[11px] font-semibold text-gray-400">
                  期限が近い書類
                </p>
                <ul className="space-y-2.5">
                  {expiring.map((d) => (
                    <li key={d.id}>
                      <ExpiryCard doc={d} today={today} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {showActivity && activity.length > 0 && (
              <ActivitySection items={activity} today={today} withHeader={filter === "all"} />
            )}
          </>
        )}
      </div>
    </>
  );
}

function ExpiryCard({ doc, today }: { doc: ExpiringDocument; today: string }) {
  const left = daysUntil(doc.expiryDate, today);
  const urgent = left <= 14;
  return (
    <Link
      href={`/documents/${doc.id}`}
      className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 transition active:opacity-70"
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
          urgent ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
        }`}
      >
        {urgent ? <AlertCircle className="size-5" /> : <Clock className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">期限が近づいています</p>
        <p className="mt-0.5 text-[13px] text-gray-500">期限まで あと {left}日</p>
        <span className="mt-2 flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[13px] font-medium text-gray-700">
          <FileText className="size-4 shrink-0 text-gray-400" />
          <span className="truncate">{doc.title}</span>
        </span>
        <span
          className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {mdLabel(doc.expiryDate)} まで
        </span>
      </div>
    </Link>
  );
}

function ActivitySection({
  items,
  today,
  withHeader,
}: {
  items: ActivityItem[];
  today: string;
  withHeader: boolean;
}) {
  const groups = groupByDay(items, today);
  return (
    <section className={withHeader ? "mt-5" : ""}>
      {withHeader && (
        <p className="px-1 pt-2 pb-1.5 text-[11px] font-semibold text-gray-400">最近の更新</p>
      )}
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-1 pt-3 pb-1.5 text-[11px] font-semibold text-gray-400">{g.label}</p>
          <ul className="space-y-2.5">
            {g.items.map((it, i) => (
              <li key={`${it.document.id}-${it.type}-${i}`}>
                <ActivityCard item={it} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const verb = item.type === "created" ? "追加" : "更新";
  return (
    <Link
      href={`/documents/${item.document.id}`}
      className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 transition active:opacity-70"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-sm font-semibold text-gray-600">
        {item.actor.displayName.slice(0, 1) || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="flex-1 text-sm font-medium text-gray-900">
            {item.actor.displayName || "誰か"}さんが書類を{verb}しました
          </p>
          <span className="shrink-0 text-xs text-gray-400">{jstTime(item.at)}</span>
        </div>
        <span className="mt-2 flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[13px] font-medium text-gray-700">
          <FileText className="size-4 shrink-0 text-gray-400" />
          <span className="truncate">{item.document.title}</span>
        </span>
      </div>
    </Link>
  );
}

// "YYYY-MM-DD" → "M/D"
function mdLabel(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

// ISO → JST の "HH:mm"
function jstTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ISO → JST の "YYYY-MM-DD"
function jstYmd(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

function dayLabel(ymd: string, today: string): string {
  if (ymd === today) return "今日";
  if (ymd === addDays(today, -1)) return "昨日";
  const [, m, d] = ymd.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

// 発生時刻の降順に並んだ items を JST の日付でグルーピング(順序を保持)。
function groupByDay(
  items: ActivityItem[],
  today: string,
): { label: string; items: ActivityItem[] }[] {
  const groups: { label: string; items: ActivityItem[] }[] = [];
  for (const it of items) {
    const label = dayLabel(jstYmd(it.at), today);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(it);
    } else {
      groups.push({ label, items: [it] });
    }
  }
  return groups;
}
