"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentProps, createContext, useContext, useMemo } from "react";
import { isClientHref } from "./client-routes";

// FilerApp の内側かどうか。内側でだけクライアント描画ルートへの遷移を pushState にする
// (外側=詳細/通知などには FilerApp が居ないため、通常の App Router 遷移が必要)。
const FilerAppContext = createContext(false);

export function FilerAppNavProvider({ children }: { children: React.ReactNode }) {
  return <FilerAppContext.Provider value>{children}</FilerAppContext.Provider>;
}

// Next 16 は history.pushState を Router と統合しており、usePathname / useSearchParams が追従する。
function pushClient(href: string) {
  window.history.pushState(null, "", href);
  window.scrollTo(0, 0);
}

/** router.push の代替。クライアント描画ルートならサーバー往復なしで遷移する。 */
export function useAppRouter() {
  const router = useRouter();
  const inApp = useContext(FilerAppContext);
  return useMemo(
    () => ({
      push(href: string) {
        if (inApp && isClientHref(href)) pushClient(href);
        else router.push(href);
      },
    }),
    [inApp, router],
  );
}

/** next/link の代替。クライアント描画ルートは pushState、それ以外は Link に委ねる。 */
export function AppLink({
  href,
  onClick,
  ...rest
}: Omit<ComponentProps<"a">, "href"> & { href: string }) {
  const inApp = useContext(FilerAppContext);
  if (!inApp || !isClientHref(href)) return <Link href={href} onClick={onClick} {...rest} />;

  return (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        // 新規タブ等の修飾クリックはブラウザ既定動作に任せる
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        ) {
          return;
        }
        e.preventDefault();
        pushClient(href);
      }}
    />
  );
}
