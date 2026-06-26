import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import { PrismaD1 } from "@prisma/adapter-d1";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env/server";

let prisma: PrismaClient | undefined;

type CloudflareD1Env = {
  DB?: D1Database;
};

function getD1Binding() {
  if (env.ENV !== "production") {
    return null;
  }

  try {
    return (getCloudflareContext().env as CloudflareD1Env).DB ?? null;
  } catch {
    return null;
  }
}

export function getDb() {
  if (prisma) {
    return prisma;
  }

  const d1Binding = getD1Binding();
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  const databaseId = env.D1_DATABASE_ID;

  const isProd = env.ENV === "production" || process.env.NODE_ENV === "production";

  let adapter;
  if (d1Binding) {
    adapter = new PrismaD1(d1Binding);
  } else if (isProd) {
    if (accountId && apiToken && databaseId) {
      adapter = new PrismaD1({
        CLOUDFLARE_ACCOUNT_ID: accountId,
        CLOUDFLARE_D1_TOKEN: apiToken,
        CLOUDFLARE_DATABASE_ID: databaseId,
      });
    } else {
      const dummyD1: any = {
        prepare: () => dummyD1,
        bind: () => dummyD1,
        all: async () => ({ results: [] }),
        run: async () => ({}),
        select: async () => ({}),
        first: async () => null,
        exec: async () => ({}),
        batch: async () => [],
      };
      adapter = new PrismaD1(dummyD1);
    }
  } else {
    const sqliteAdapterName = "@prisma/adapter-better-sqlite3";
    const { PrismaBetterSqlite3 } = require(
      sqliteAdapterName,
    ) as typeof import("@prisma/adapter-better-sqlite3");
    adapter = new PrismaBetterSqlite3({ url: env.DATABASE_URL });
  }

  prisma = new PrismaClient({ adapter });
  return prisma;
}
