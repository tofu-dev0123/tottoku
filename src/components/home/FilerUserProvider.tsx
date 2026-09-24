"use client";

import { createContext, useContext } from "react";

// ログイン中のユーザー。表示(サイドバー/ホーム)と楽観的更新の「更新者」に使う。
export type FilerUser = {
  id: string;
  displayName: string;
  email: string | null;
  image: string | null;
};

const FilerUserContext = createContext<FilerUser | null>(null);

export function FilerUserProvider({
  user,
  children,
}: {
  user: FilerUser;
  children: React.ReactNode;
}) {
  return <FilerUserContext.Provider value={user}>{children}</FilerUserContext.Provider>;
}

export function useFilerUser(): FilerUser {
  const user = useContext(FilerUserContext);
  if (!user) throw new Error("useFilerUser は FilerUserProvider の内側で使う");
  return user;
}
