import "server-only";
import { neon } from "@neondatabase/serverless";
import { type NeonHttpDatabase, drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

// DB_DRIVER で接続先を分岐する:
//   neon → Neon(HTTP, サーバーレス向き。本番/検証)
//   pg   → 素の PostgreSQL(TCP。ローカル docker など)
// クエリ API は共通なので、型は NeonHttpDatabase に揃える。
type DB = NeonHttpDatabase<typeof schema>;

function createDb(): DB {
  if (env.DB_DRIVER === "pg") {
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    return drizzlePg(pool, { schema }) as unknown as DB;
  }
  return drizzleNeon(neon(env.DATABASE_URL), { schema });
}

export const db = createDb();
