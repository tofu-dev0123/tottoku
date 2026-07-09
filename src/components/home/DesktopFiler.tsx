import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Folder,
  FolderPlus,
  History,
  Home,
  Inbox,
  LayoutGrid,
  List,
  Search,
  Upload,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { daysUntil, formatDateJST, todayInJST } from "@/lib/date";
import type { FilerCounts, FilerDocument, FolderSummary } from "@/server/filer";
import { LogoutButton } from "./LogoutButton";

const GRID = "grid grid-cols-[1fr_180px_130px_150px] items-center";

export function DesktopFiler({
  displayName,
  email,
  folders,
  documents,
  counts,
}: {
  displayName: string;
  email: string | null;
  folders: FolderSummary[];
  documents: FilerDocument[];
  counts: FilerCounts;
}) {
  const today = todayInJST();

  return (
    <div className="flex h-dvh bg-white text-gray-900">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-gray-100 p-3">
        <div className="px-2 py-2">
          <Image
            src="/tottoku.png"
            alt="とっとく"
            width={745}
            height={280}
            className="h-6 w-auto"
          />
        </div>

        <p className="px-2 pt-3 pb-1 text-[11px] font-semibold text-gray-400">よく使う項目</p>
        <nav className="space-y-0.5">
          <SideItem icon={<Home className="size-4" />} label="ホーム" href="/" active />
          <SideItem
            icon={<Clock className="size-4" />}
            label="期限が近い"
            href="/documents?expiring_within=30"
            badge={counts.expiringSoon}
            badgeAmber
          />
          <SideItem
            icon={<Inbox className="size-4" />}
            label="未分類"
            href="/documents?folder_id=none"
            badge={counts.unclassified}
          />
          <SideItem icon={<History className="size-4" />} label="最近追加" href="/documents" />
        </nav>

        <p className="px-2 pt-4 pb-1 text-[11px] font-semibold text-gray-400">フォルダ</p>
        <nav className="space-y-0.5 overflow-auto">
          {folders.map((f) => (
            <SideItem
              key={f.id}
              icon={<Folder className="size-4" />}
              label={f.name}
              href={`/folders/${f.id}`}
            />
          ))}
        </nav>

        <div className="mt-auto border-t border-gray-200 pt-2">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <User className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{displayName || "ユーザー"}</p>
              {email && <p className="truncate text-[11px] text-gray-400">{email}</p>}
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2.5">
          <div className="flex text-gray-400">
            <span className="flex size-7 items-center justify-center rounded-md">
              <ChevronLeft className="size-4" />
            </span>
            <span className="flex size-7 items-center justify-center rounded-md text-gray-700">
              <ChevronRight className="size-4" />
            </span>
          </div>
          <h1 className="text-[15px] font-semibold">わが家の書類</h1>
          <div className="flex-1" />
          <Link
            href="/search"
            className="flex w-52 items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-gray-400"
          >
            <Search className="size-4" />
            <span className="text-[13px]">検索</span>
          </Link>
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            <span className="flex size-8 items-center justify-center bg-white text-gray-500">
              <LayoutGrid className="size-4" />
            </span>
            <span className="flex size-8 items-center justify-center bg-blue-700 text-white">
              <List className="size-4" />
            </span>
          </div>
          <Link
            href="/folders/new"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold"
          >
            <FolderPlus className="size-4" />
            新規フォルダ
          </Link>
          <Link
            href="/documents/new"
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-[13px] font-semibold text-white"
          >
            <Upload className="size-4" />
            書類を追加
          </Link>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          <div
            className={`${GRID} sticky top-0 border-b border-gray-200 bg-white px-5 py-2 text-xs text-gray-500`}
          >
            <div>名前</div>
            <div>フォルダ</div>
            <div>追加日</div>
            <div className="text-right">期限</div>
          </div>

          {folders.map((f) => (
            <Link
              key={f.id}
              href={`/folders/${f.id}`}
              className={`${GRID} border-b border-gray-100 px-5 py-2.5 hover:bg-gray-50`}
            >
              <span className="flex items-center gap-3">
                <Folder className="size-5 text-blue-700" />
                <span className="font-medium">{f.name}</span>
              </span>
              <span className="text-gray-400">—</span>
              <span className="text-gray-500">{f.count}件</span>
              <span className="text-right text-gray-400">—</span>
            </Link>
          ))}

          {documents.map((d) => (
            <Link
              key={d.id}
              href={`/documents/${d.id}`}
              className={`${GRID} border-b border-gray-100 px-5 py-2.5 hover:bg-gray-50`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <FileText className="size-5 shrink-0 text-gray-400" />
                <span className="truncate font-medium">{d.title}</span>
              </span>
              <span className="truncate text-[13px] text-gray-500">
                {d.folderNames.length > 0 ? d.folderNames.join(" / ") : "未分類"}
              </span>
              <span className="text-gray-500">{formatDateJST(d.createdAt)}</span>
              <span className="text-right">
                <ExpiryPill expiryDate={d.expiryDate} today={today} />
              </span>
            </Link>
          ))}
        </div>

        <div className="border-t border-gray-200 px-5 py-1.5 text-xs text-gray-500">
          {folders.length} フォルダ・{documents.length} 書類
        </div>
      </div>
    </div>
  );
}

function SideItem({
  icon,
  label,
  href,
  active,
  badge,
  badgeAmber,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
  badge?: number;
  badgeAmber?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
        active ? "bg-blue-100 text-blue-800" : "text-gray-700 hover:bg-gray-200/60"
      }`}
    >
      <span className="text-blue-700">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span
          className={`min-w-5 rounded-full px-1.5 text-center text-[11px] text-white ${
            badgeAmber ? "bg-amber-500" : "bg-gray-400"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function ExpiryPill({ expiryDate, today }: { expiryDate: string | null; today: string }) {
  if (!expiryDate) return <span className="text-gray-400">—</span>;
  const left = daysUntil(expiryDate, today);
  if (left < 0) {
    return (
      <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        期限切れ
      </span>
    );
  }
  const urgent = left <= 14;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      あと{left}日
    </span>
  );
}
