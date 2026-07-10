import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { isAllowedEmail } from "@/lib/allowlist";
import { authConfig } from "@/lib/auth.config";
import { env } from "@/lib/env";

// Node 側の完全な Auth.js 設定。edge 用 authConfig に DB を伴う jwt を足す。
// 方針の詳細は docs/api/auth.md。
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    // 初回サインイン時のみ users を upsert し、内部 user id をトークンに載せる
    async jwt({ token, user }) {
      if (user?.email && isAllowedEmail(user.email, env.allowedEmails)) {
        const email = user.email.toLowerCase();
        const existing = await db
          .select({ id: users.id, displayName: users.displayName })
          .from(users)
          .where(eq(users.email, email));
        let row = existing[0];
        if (!row) {
          const inserted = await db
            .insert(users)
            .values({ email, displayName: user.name ?? email })
            .returning({ id: users.id, displayName: users.displayName });
          row = inserted[0];
        }
        token.uid = row.id;
        token.displayName = row.displayName;
      }
      return token;
    },
  },
});
