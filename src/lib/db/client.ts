import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleBetterSqlite3 } from "drizzle-orm/better-sqlite3";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core/db";
import Database from "better-sqlite3";

import * as schema from "./schema";
import * as relations from "./relations";
import { env } from "@/lib/env/server";

const fullSchema = { ...schema, ...relations };

type DrizzleDb = BaseSQLiteDatabase<"sync" | "async", unknown, typeof fullSchema>;

let db: DrizzleDb | undefined;
const d1Databases = new WeakSet<object>();

export type Db = DrizzleDb;

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

export function getDb(): Db {
  if (db) {
    return db;
  }

  const d1Binding = getD1Binding();
  if (d1Binding) {
    db = drizzleD1(d1Binding, { schema: fullSchema });
    d1Databases.add(db);
  } else {
    // Local SQLite development using better-sqlite3
    const databaseUrl = env.DATABASE_URL || "file:./dev.db";
    const rawPath = databaseUrl.replace(/^file:/, "");
    const dbPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
    mkdirSync(path.dirname(dbPath), { recursive: true });
    const sqlite = new Database(dbPath);
    db = drizzleBetterSqlite3(sqlite, { schema: fullSchema }) as DrizzleDb;
  }

  return db;
}

/**
 * Runs a multi-statement write operation without issuing transaction control
 * statements on D1, which does not support Drizzle's SQLite `BEGIN` flow.
 * Local SQLite keeps its transaction semantics.
 */
export async function runDbWriteOperation<T>(
  database: Db,
  operation: (executor: Db) => Promise<T>,
): Promise<T> {
  if (d1Databases.has(database)) {
    return operation(database);
  }

  return database.transaction(async (transaction) => operation(transaction as Db));
}
