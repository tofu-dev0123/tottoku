import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { FilerApp } from "@/components/home/FilerApp";
import { auth } from "@/lib/auth";
import { bootstrapQueryKey } from "@/lib/bootstrap-query";
import { getBootstrapData } from "@/server/bootstrap";

// ファイラー系(ホーム/フォルダ/一覧/検索)の共通レイアウト。全メタデータを1回だけ取得して
// クライアントストア(TanStack Query)へハイドレーションし、以降の描画は FilerApp がストアから行う。
// 変更後の router.refresh() でレイアウトが再描画されると、新しいデータが再ハイドレーションされる。

// 認証必須・家族の最新データを毎リクエスト出すため、配下全体を動的化する
// (ビルド時に静的プリレンダリングされて DB データが焼き込まれるのを防ぐ)。
export const dynamic = "force-dynamic";

export default async function FilerLayout({ children }: { children: React.ReactNode }) {
  const [session, bootstrap] = await Promise.all([auth(), getBootstrapData()]);

  const queryClient = new QueryClient();
  queryClient.setQueryData(bootstrapQueryKey, bootstrap);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FilerApp
        user={{
          displayName: session?.user?.displayName ?? "",
          email: session?.user?.email ?? null,
          image: session?.user?.image ?? null,
        }}
      >
        {children}
      </FilerApp>
    </HydrationBoundary>
  );
}
