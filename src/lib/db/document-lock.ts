import "server-only";

import postgres from "postgres";

import { env } from "@/lib/env/server";
import { resolveDocumentLockDatabaseUrl } from "@/lib/db/document-lock-config";

const lockConnectionLimit = 2;
const lockDatabaseUrl = resolveDocumentLockDatabaseUrl(env.DATABASE_URL, env.DATABASE_URL_UNPOOLED);

let reservedLockSlots = 0;

const wait = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs));

/**
 * Acquires a dedicated Postgres session advisory lock for a document. Each holder
 * gets a short-lived client, which is closed on release so failed unlocks cannot
 * return a still-locked session to another job. Postgres remains the lock authority.
 */
export async function acquireDocumentLock(
  lockKey: string,
  assertLease: () => Promise<void>,
): Promise<() => Promise<void>> {
  while (reservedLockSlots >= lockConnectionLimit) {
    await assertLease();
    await wait(100);
  }
  reservedLockSlots += 1;

  let connection: ReturnType<typeof postgres> | undefined;
  let acquired = false;
  try {
    connection = postgres(lockDatabaseUrl, { max: 1, prepare: false });
    while (!acquired) {
      await assertLease();
      const [row] = await connection`
        SELECT pg_try_advisory_lock(hashtextextended(${lockKey}, 0)) AS acquired
      `;
      acquired = Boolean(row?.acquired);
      if (!acquired) await wait(100);
    }
  } catch (error) {
    try {
      await connection?.end({ timeout: 1 });
    } finally {
      reservedLockSlots -= 1;
    }
    throw error;
  }

  let released = false;
  return async () => {
    if (released) return;
    released = true;
    try {
      await connection`
        SELECT pg_advisory_unlock(hashtextextended(${lockKey}, 0))
      `;
    } finally {
      try {
        await connection.end({ timeout: 1 });
      } finally {
        reservedLockSlots -= 1;
      }
    }
  };
}
