import "../cloudflare/server-only";

import { drizzle, type AnyD1Database, type DrizzleD1Database } from "drizzle-orm/d1";
import { cache } from "react";

import * as schema from "@/lib/db/schema";
import * as relations from "./relations";
import { env } from "@/lib/env/server";
import {
  getLocalD1Database,
  getLocalStoreFromClient,
  runLocalWriteTransaction,
} from "@/lib/db/local-d1";

const fullSchema = { ...schema, ...relations };

function resolveD1Binding(): AnyD1Database | undefined {
  const cfContext = (
    globalThis as unknown as Record<symbol, { env?: { DB?: AnyD1Database } } | undefined>
  )[Symbol.for("__cloudflare-context__")];
  return cfContext?.env?.DB;
}

export function createDbForUrl(databaseUrl?: string) {
  const binding = databaseUrl ? undefined : resolveD1Binding();
  const client = binding ?? getLocalD1Database(databaseUrl ?? env.DATABASE_URL);
  return drizzle(client, { schema: fullSchema });
}

export type Db = DrizzleD1Database<typeof fullSchema> & {
  $client: AnyD1Database;
};

export const getDb = cache(() => createDbForUrl() as Db);

export function isInteractiveTransactionSupported(database: Db): boolean {
  return getLocalStoreFromClient(database.$client) !== null;
}

/**
 * Runs a multi-statement write operation inside a real SQLite transaction locally
 * (where `node:sqlite` supports `BEGIN IMMEDIATE` / `SAVEPOINT`), or sequentially
 * on Cloudflare D1 where interactive SQL `BEGIN` statements are disallowed.
 */
export async function runDbWriteOperation<T>(
  database: Db,
  operation: (executor: Db) => Promise<T>,
): Promise<T> {
  const localStore = getLocalStoreFromClient(database.$client);
  if (localStore) {
    return runLocalWriteTransaction(localStore, () => operation(database));
  }
  return operation(database);
}

export { chunkArray } from "@/lib/db/utils";

export function isUniqueConstraintError(error: unknown, depth = 0): boolean {
  if (depth > 4 || typeof error !== "object" || error === null) return false;

  if ("code" in error) {
    const code = error.code;
    if (
      code === "23505" ||
      code === "SQLITE_CONSTRAINT_UNIQUE" ||
      code === "SQLITE_CONSTRAINT_PRIMARYKEY"
    ) {
      return true;
    }
  }

  if ("errcode" in error) {
    const errcode = error.errcode;
    if (errcode === 2067 || errcode === 1555) {
      return true;
    }
  }

  if ("message" in error && typeof error.message === "string") {
    const normalized = error.message.toLowerCase();
    if (
      normalized.includes("unique constraint failed") ||
      normalized.includes("unique constraint") ||
      normalized.includes("primary key constraint failed")
    ) {
      return true;
    }
  }

  return "cause" in error && isUniqueConstraintError(error.cause, depth + 1);
}
