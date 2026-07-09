import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** 内部 users.id */
      id: string;
      /** 表示名(users.display_name) */
      displayName: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** 内部 users.id */
    uid?: string;
    displayName?: string;
  }
}
