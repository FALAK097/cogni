import "server-only";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaD1 } from "@prisma/adapter-d1";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env/server";

let prisma: PrismaClient | undefined;

export function getDb() {
  if (prisma) {
    return prisma;
  }

  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  const databaseId = env.D1_DATABASE_ID;
  const useD1 =
    env.ENV === "production" && Boolean(accountId) && Boolean(apiToken) && Boolean(databaseId);
  const adapter =
    useD1 && accountId && apiToken && databaseId
      ? new PrismaD1({
          CLOUDFLARE_ACCOUNT_ID: accountId,
          CLOUDFLARE_D1_TOKEN: apiToken,
          CLOUDFLARE_DATABASE_ID: databaseId,
        })
      : new PrismaBetterSqlite3({ url: env.DATABASE_URL });

  prisma = new PrismaClient({ adapter });
  return prisma;
}
