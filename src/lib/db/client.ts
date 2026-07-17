import "server-only";

import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "./schema";
import * as relations from "./relations";
import { env } from "@/lib/env/server";

const fullSchema = { ...schema, ...relations };

neonConfig.webSocketConstructor = ws;

let db: ReturnType<typeof createDb> | undefined;

function createDb() {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  return drizzle(pool, { schema: fullSchema });
}

export type Db = ReturnType<typeof createDb>;

export function getDb(): Db {
  if (db) {
    return db;
  }

  db = createDb();

  return db;
}

/**
 * Runs a multi-statement write operation in a database transaction.
 */
export async function runDbWriteOperation<T>(
  database: Db,
  operation: (executor: Db) => Promise<T>,
): Promise<T> {
  return database.transaction(async (transaction) => operation(transaction as unknown as Db));
}
