import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { cache } from "react";

import * as schema from "./schema";
import * as relations from "./relations";
import { env } from "@/lib/env/server";

const fullSchema = { ...schema, ...relations };

function createDb() {
  const isLocal =
    env.DATABASE_URL?.includes("localhost") || env.DATABASE_URL?.includes("127.0.0.1");
  const client = postgres(env.DATABASE_URL, {
    max: 1,
    prepare: false,
    ssl: isLocal ? false : "require",
    connect_timeout: 15,
    idle_timeout: 1,
    max_lifetime: 5,
  });

  return drizzle(client, { schema: fullSchema });
}

export type Db = ReturnType<typeof createDb>;

export const getDb = cache(() => createDb());

/**
 * Runs a multi-statement write operation in a database transaction.
 */
export async function runDbWriteOperation<T>(
  database: Db,
  operation: (executor: Db) => Promise<T>,
): Promise<T> {
  return database.transaction(async (transaction) => operation(transaction as unknown as Db));
}
