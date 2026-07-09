import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowedEmail } from "@/lib/allowlist";
import { env } from "@/lib/env";

// edge(proxy) でも読める設定。DB には触れない(pg を edge バンドルに入れない)。
// DB を伴う jwt コールバックは Node 側の auth.ts で足す。
export const authConfig = {
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30日
  },
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // allowlist に無いメールはログイン拒否
    signIn: ({ user }) => isAllowedEmail(user.email, env.allowedEmails),

    // トークンの内部 id / 表示名をセッションへ反映(DB 不要)
    session({ session, token }) {
      if (typeof token.uid === "string") {
        session.user.id = token.uid;
        session.user.displayName =
          typeof token.displayName === "string" ? token.displayName : (session.user.name ?? "");
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
