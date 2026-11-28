import "server-only";

import { and, eq, lte } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { documentLock } from "@/lib/db/schema";

const lockLeaseTtlMs = 2 * 60 * 1_000;
const lockRenewIntervalMs = 30 * 1_000;

const wait = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs));

function isWorkersRuntime(): boolean {
  return (
    typeof globalThis.navigator?.userAgent === "string" &&
    globalThis.navigator.userAgent === "Cloudflare-Workers"
  );
}

/**
 * Acquires a durable lease row in `document_lock` for a document. Each holder
 * renews its lease periodically while active so crashed workers expire cleanly.
 */
export async function acquireDocumentLock(
  lockKey: string,
  assertLease: () => Promise<void>,
): Promise<() => Promise<void>> {
  const db = getDb();
  const ownerToken = crypto.randomUUID();
  let acquired = false;

  while (!acquired) {
    await assertLease();
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const expiresAtIso = new Date(now + lockLeaseTtlMs).toISOString();

    const rows = await db
      .insert(documentLock)
      .values({
        lockKey,
        ownerToken,
        expiresAt: expiresAtIso,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: documentLock.lockKey,
        set: {
          ownerToken,
          expiresAt: expiresAtIso,
          updatedAt: nowIso,
        },
        setWhere: lte(documentLock.expiresAt, nowIso),
      })
      .returning({ lockKey: documentLock.lockKey });

    acquired = rows.length > 0;
    if (!acquired) await wait(100);
  }

  let released = false;
  const renewTimer = isWorkersRuntime()
    ? undefined
    : setInterval(() => {
        if (released) return;
        const now = Date.now();
        const nowIso = new Date(now).toISOString();
        const expiresAtIso = new Date(now + lockLeaseTtlMs).toISOString();
        void db
          .update(documentLock)
          .set({ expiresAt: expiresAtIso, updatedAt: nowIso })
          .where(and(eq(documentLock.lockKey, lockKey), eq(documentLock.ownerToken, ownerToken)))
          .catch(() => {
            // Lease expiration guards against stalled/crashed holders.
          });
      }, lockRenewIntervalMs);
  renewTimer?.unref?.();

  return async () => {
    if (released) return;
    released = true;
    if (renewTimer) clearInterval(renewTimer);
    await db
      .delete(documentLock)
      .where(and(eq(documentLock.lockKey, lockKey), eq(documentLock.ownerToken, ownerToken)));
  };
}
