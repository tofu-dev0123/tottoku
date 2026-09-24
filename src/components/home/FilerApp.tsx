"use client";

import { FileQuestion } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { DesktopDocumentList } from "@/components/documents/DesktopDocumentList";
import { DocumentDetail } from "@/components/documents/DocumentDetail";
import { MobileDocumentList } from "@/components/documents/MobileDocumentList";
import { todayInJST } from "@/lib/date";
import {
  childFolders,
  documentDetail,
  documentList,
  expiringDocuments,
  filerCounts,
  filerView,
  folderOptions,
} from "@/lib/filer-derive";
import type { BootstrapData } from "@/server/bootstrap";
import { AppLink, FilerAppNavProvider } from "./AppLink";
import { type ClientRoute, documentListScreen, matchClientRoute } from "./client-routes";
import { DesktopFiler } from "./DesktopFiler";
import { FilerSidebar } from "./FilerSidebar";
import { MobileFolderView } from "./MobileFolderView";
import { MobileHome } from "./MobileHome";
import { useBootstrap } from "./use-bootstrap";

export type FilerUser = { displayName: string; email: string | null; image: string | null };

// (filer) の画面本体。サイドバーとクライアント描画ルート(ホーム/フォルダ/書類一覧/書類詳細/検索)は
// ストアから描画し、pushState による遷移ではサーバー往復なしで即時に切り替える。
// クライアント描画ルートに該当しない場合のみサーバー描画の children を表示する。
export function FilerApp({ user, children }: { user: FilerUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = matchClientRoute(pathname);
  const data = useBootstrap();
  const today = todayInJST();
  // 遷移ごとに再マウントしてスクロール位置・編集/メニュー状態をリセットする
  const screenKey = `${pathname}?${searchParams.toString()}`;

  // 書類詳細はサイドバーなしの全幅画面(従来の体裁)
  if (route?.kind === "document") {
    const doc = documentDetail(data, route.id);
    return (
      <FilerAppNavProvider>
        {doc ? (
          <div key={screenKey} className="min-h-dvh bg-gray-50">
            <DocumentDetail doc={doc} folderOptions={folderOptions(data)} />
          </div>
        ) : (
          <NotFoundPanel title="書類が見つかりません" />
        )}
      </FilerAppNavProvider>
    );
  }

  return (
    <FilerAppNavProvider>
      <div className="md:flex md:h-dvh md:bg-white md:text-gray-900">
        <div className="hidden md:flex">
          <FilerSidebar
            displayName={user.displayName}
            email={user.email}
            image={user.image}
            sidebarFolders={childFolders(data, null)}
            counts={filerCounts(data, today)}
          />
        </div>
        <div className="min-w-0 md:flex-1">
          {route ? (
            <ClientScreen
              key={screenKey}
              route={route}
              searchParams={searchParams}
              data={data}
              user={user}
              today={today}
            />
          ) : (
            children
          )}
        </div>
      </div>
    </FilerAppNavProvider>
  );
}

function ClientScreen({
  route,
  searchParams,
  data,
  user,
  today,
}: {
  route: Exclude<ClientRoute, { kind: "document" }>;
  searchParams: URLSearchParams;
  data: BootstrapData;
  user: FilerUser;
  today: string;
}) {
  if (route.kind === "documents" || route.kind === "search") {
    const screen = documentListScreen(route.kind, searchParams);
    const documents = screen.params ? documentList(data, screen.params, today) : [];
    const props = {
      title: screen.title,
      documents,
      search: screen.search,
      emptyMessage: screen.emptyMessage,
    };
    return (
      <>
        <div className="md:hidden">
          <MobileDocumentList {...props} />
        </div>
        <div className="hidden md:block">
          <DesktopDocumentList {...props} />
        </div>
      </>
    );
  }

  const view = filerView(data, route.kind === "folder" ? route.id : null);
  if (!view) return <NotFoundPanel title="フォルダが見つかりません" />;

  const mobile =
    route.kind === "home" ? (
      <MobileHome
        displayName={user.displayName}
        image={user.image}
        docs={expiringDocuments(data, today)}
      />
    ) : (
      <MobileFolderView view={view} />
    );

  return (
    <>
      <div className="md:hidden">{mobile}</div>
      <div className="hidden md:block">
        <DesktopFiler view={view} />
      </div>
    </>
  );
}

// 存在しない(削除された)フォルダ/書類。app/not-found.tsx と同じ体裁で出す。
function NotFoundPanel({ title }: { title: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center md:h-dvh md:min-h-0 md:bg-white">
      <span className="flex size-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <FileQuestion className="size-7" />
      </span>
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">移動または削除された可能性があります。</p>
      </div>
      <AppLink
        href="/"
        className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
      >
        ホームに戻る
      </AppLink>
    </div>
  );
}
