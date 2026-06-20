import "server-only";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaD1 } from "@prisma/adapter-d1";

import { PrismaClient } from "@/generated/prisma/client";
import { env, getD1Config } from "@/lib/env/server";

let prisma: PrismaClient | undefined;

export function getDb() {
  if (prisma) {
    return prisma;
  }

  const d1 = getD1Config();
  const adapter = d1
    ? new PrismaD1({
        CLOUDFLARE_ACCOUNT_ID: d1.accountId,
        CLOUDFLARE_D1_TOKEN: d1.apiToken,
        CLOUDFLARE_DATABASE_ID: d1.databaseId,
        CLOUDFLARE_SHADOW_DATABASE_ID: d1.shadowDatabaseId,
      })
    : new PrismaBetterSqlite3({ url: env.DATABASE_URL });

  prisma = new PrismaClient({ adapter });
  return prisma;
}
