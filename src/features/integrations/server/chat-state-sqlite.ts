import type { Lock, QueueEntry, StateAdapter } from "chat";
import { and, asc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import { chunkArray } from "@/lib/db/utils";
import {
  chatStateCache,
  chatStateList,
  chatStateLock,
  chatStateQueue,
  chatStateSubscription,
} from "@/lib/db/schema";

function generateLockToken() {
  return `sqlite_${crypto.randomUUID()}`;
}

export class SqliteChatStateAdapter implements StateAdapter {
  private readonly db: Db;
  private readonly keyPrefix: string;
  private connected = false;

  constructor({ db, keyPrefix = "chat-sdk" }: { db: Db; keyPrefix?: string }) {
    this.db = db;
    this.keyPrefix = keyPrefix;
  }

  private ensureConnected() {
    if (!this.connected) {
      throw new Error("SqliteChatStateAdapter is not connected. Call connect() first.");
    }
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.db.run(sql`select 1`);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async subscribe(threadId: string): Promise<void> {
    this.ensureConnected();
    await this.db
      .insert(chatStateSubscription)
      .values({ keyPrefix: this.keyPrefix, threadId })
      .onConflictDoNothing();
  }

  async unsubscribe(threadId: string): Promise<void> {
    this.ensureConnected();
    await this.db
      .delete(chatStateSubscription)
      .where(
        and(
          eq(chatStateSubscription.keyPrefix, this.keyPrefix),
          eq(chatStateSubscription.threadId, threadId),
        ),
      );
  }

  async isSubscribed(threadId: string): Promise<boolean> {
    this.ensureConnected();
    const rows = await this.db
      .select({ threadId: chatStateSubscription.threadId })
      .from(chatStateSubscription)
      .where(
        and(
          eq(chatStateSubscription.keyPrefix, this.keyPrefix),
          eq(chatStateSubscription.threadId, threadId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async acquireLock(threadId: string, ttlMs: number): Promise<Lock | null> {
    this.ensureConnected();
    const now = Date.now();
    const token = generateLockToken();
    const expiresAt = now + ttlMs;
    const rows = await this.db
      .insert(chatStateLock)
      .values({
        keyPrefix: this.keyPrefix,
        threadId,
        token,
        expiresAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [chatStateLock.keyPrefix, chatStateLock.threadId],
        set: {
          token,
          expiresAt,
          updatedAt: now,
        },
        setWhere: lte(chatStateLock.expiresAt, now),
      })
      .returning({
        threadId: chatStateLock.threadId,
        token: chatStateLock.token,
        expiresAt: chatStateLock.expiresAt,
      });

    const lock = rows[0];
    if (!lock) return null;
    return {
      threadId: lock.threadId,
      token: lock.token,
      expiresAt: lock.expiresAt,
    };
  }

  async forceReleaseLock(threadId: string): Promise<void> {
    this.ensureConnected();
    await this.db
      .delete(chatStateLock)
      .where(
        and(eq(chatStateLock.keyPrefix, this.keyPrefix), eq(chatStateLock.threadId, threadId)),
      );
  }

  async releaseLock(lock: Lock): Promise<void> {
    this.ensureConnected();
    await this.db
      .delete(chatStateLock)
      .where(
        and(
          eq(chatStateLock.keyPrefix, this.keyPrefix),
          eq(chatStateLock.threadId, lock.threadId),
          eq(chatStateLock.token, lock.token),
        ),
      );
  }

  async extendLock(lock: Lock, ttlMs: number): Promise<boolean> {
    this.ensureConnected();
    const now = Date.now();
    const rows = await this.db
      .update(chatStateLock)
      .set({
        expiresAt: now + ttlMs,
        updatedAt: now,
      })
      .where(
        and(
          eq(chatStateLock.keyPrefix, this.keyPrefix),
          eq(chatStateLock.threadId, lock.threadId),
          eq(chatStateLock.token, lock.token),
          gt(chatStateLock.expiresAt, now),
        ),
      )
      .returning({ threadId: chatStateLock.threadId });
    return rows.length > 0;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    this.ensureConnected();
    const now = Date.now();
    const rows = await this.db
      .select({ value: chatStateCache.value })
      .from(chatStateCache)
      .where(
        and(
          eq(chatStateCache.keyPrefix, this.keyPrefix),
          eq(chatStateCache.cacheKey, key),
          or(isNull(chatStateCache.expiresAt), gt(chatStateCache.expiresAt, now)),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      await this.db
        .delete(chatStateCache)
        .where(
          and(
            eq(chatStateCache.keyPrefix, this.keyPrefix),
            eq(chatStateCache.cacheKey, key),
            lte(chatStateCache.expiresAt, now),
          ),
        );
      return null;
    }

    try {
      return JSON.parse(rows[0].value) as T;
    } catch {
      return rows[0].value as unknown as T;
    }
  }

  async set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.ensureConnected();
    const now = Date.now();
    const serialized = JSON.stringify(value);
    const expiresAt = ttlMs ? now + ttlMs : null;
    await this.db
      .insert(chatStateCache)
      .values({
        keyPrefix: this.keyPrefix,
        cacheKey: key,
        value: serialized,
        expiresAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [chatStateCache.keyPrefix, chatStateCache.cacheKey],
        set: {
          value: serialized,
          expiresAt,
          updatedAt: now,
        },
      });
  }

  async setIfNotExists(key: string, value: unknown, ttlMs?: number): Promise<boolean> {
    this.ensureConnected();
    const now = Date.now();
    const serialized = JSON.stringify(value);
    const expiresAt = ttlMs ? now + ttlMs : null;
    const rows = await this.db
      .insert(chatStateCache)
      .values({
        keyPrefix: this.keyPrefix,
        cacheKey: key,
        value: serialized,
        expiresAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [chatStateCache.keyPrefix, chatStateCache.cacheKey],
        set: {
          value: serialized,
          expiresAt,
          updatedAt: now,
        },
        setWhere: lte(chatStateCache.expiresAt, now),
      })
      .returning({ cacheKey: chatStateCache.cacheKey });
    return rows.length > 0;
  }

  async delete(key: string): Promise<void> {
    this.ensureConnected();
    await this.db
      .delete(chatStateCache)
      .where(and(eq(chatStateCache.keyPrefix, this.keyPrefix), eq(chatStateCache.cacheKey, key)));
  }

  async appendToList(
    key: string,
    value: unknown,
    options?: { maxLength?: number; ttlMs?: number },
  ): Promise<void> {
    this.ensureConnected();
    const now = Date.now();
    const serialized = JSON.stringify(value);
    const expiresAt = options?.ttlMs ? now + options.ttlMs : null;
    await this.db.insert(chatStateList).values({
      keyPrefix: this.keyPrefix,
      listKey: key,
      value: serialized,
      expiresAt,
    });

    if (options?.maxLength !== undefined && options.maxLength >= 0) {
      const allRows = await this.db
        .select({ seq: chatStateList.seq })
        .from(chatStateList)
        .where(and(eq(chatStateList.keyPrefix, this.keyPrefix), eq(chatStateList.listKey, key)))
        .orderBy(asc(chatStateList.seq));
      const excess = allRows.length - options.maxLength;
      if (excess > 0) {
        for (const seqBatch of chunkArray(
          allRows.slice(0, excess).map((row) => row.seq),
          80,
        )) {
          await this.db.delete(chatStateList).where(inArray(chatStateList.seq, seqBatch));
        }
      }
    }

    if (expiresAt !== null) {
      await this.db
        .update(chatStateList)
        .set({ expiresAt })
        .where(and(eq(chatStateList.keyPrefix, this.keyPrefix), eq(chatStateList.listKey, key)));
    }
  }

  async getList<T = unknown>(key: string): Promise<T[]> {
    this.ensureConnected();
    const now = Date.now();
    const rows = await this.db
      .select({ value: chatStateList.value })
      .from(chatStateList)
      .where(
        and(
          eq(chatStateList.keyPrefix, this.keyPrefix),
          eq(chatStateList.listKey, key),
          or(isNull(chatStateList.expiresAt), gt(chatStateList.expiresAt, now)),
        ),
      )
      .orderBy(asc(chatStateList.seq));
    return rows.map((row) => JSON.parse(row.value) as T);
  }

  async enqueue(threadId: string, entry: QueueEntry, maxSize: number): Promise<number> {
    this.ensureConnected();
    const now = Date.now();
    const serialized = JSON.stringify(entry);
    const expiresAt = entry.expiresAt;

    await this.db
      .delete(chatStateQueue)
      .where(
        and(
          eq(chatStateQueue.keyPrefix, this.keyPrefix),
          eq(chatStateQueue.threadId, threadId),
          lte(chatStateQueue.expiresAt, now),
        ),
      );

    await this.db.insert(chatStateQueue).values({
      keyPrefix: this.keyPrefix,
      threadId,
      value: serialized,
      expiresAt,
    });

    if (maxSize > 0) {
      const liveRows = await this.db
        .select({ seq: chatStateQueue.seq })
        .from(chatStateQueue)
        .where(
          and(
            eq(chatStateQueue.keyPrefix, this.keyPrefix),
            eq(chatStateQueue.threadId, threadId),
            gt(chatStateQueue.expiresAt, now),
          ),
        )
        .orderBy(asc(chatStateQueue.seq));
      const excess = liveRows.length - maxSize;
      if (excess > 0) {
        for (const seqBatch of chunkArray(
          liveRows.slice(0, excess).map((row) => row.seq),
          80,
        )) {
          await this.db.delete(chatStateQueue).where(inArray(chatStateQueue.seq, seqBatch));
        }
      }
      return Math.min(liveRows.length, maxSize);
    }

    return this.queueDepth(threadId);
  }

  async dequeue(threadId: string): Promise<QueueEntry | null> {
    this.ensureConnected();
    const now = Date.now();
    await this.db
      .delete(chatStateQueue)
      .where(
        and(
          eq(chatStateQueue.keyPrefix, this.keyPrefix),
          eq(chatStateQueue.threadId, threadId),
          lte(chatStateQueue.expiresAt, now),
        ),
      );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const [oldest] = await this.db
        .select({ seq: chatStateQueue.seq, value: chatStateQueue.value })
        .from(chatStateQueue)
        .where(
          and(
            eq(chatStateQueue.keyPrefix, this.keyPrefix),
            eq(chatStateQueue.threadId, threadId),
            gt(chatStateQueue.expiresAt, now),
          ),
        )
        .orderBy(asc(chatStateQueue.seq))
        .limit(1);

      if (!oldest) return null;

      const deleted = await this.db
        .delete(chatStateQueue)
        .where(
          and(
            eq(chatStateQueue.keyPrefix, this.keyPrefix),
            eq(chatStateQueue.threadId, threadId),
            eq(chatStateQueue.seq, oldest.seq),
          ),
        )
        .returning({ value: chatStateQueue.value });

      if (deleted[0]) {
        return JSON.parse(deleted[0].value) as QueueEntry;
      }
    }

    return null;
  }

  async queueDepth(threadId: string): Promise<number> {
    this.ensureConnected();
    const now = Date.now();
    const rows = await this.db
      .select({ depth: sql<number>`count(*)`.mapWith(Number) })
      .from(chatStateQueue)
      .where(
        and(
          eq(chatStateQueue.keyPrefix, this.keyPrefix),
          eq(chatStateQueue.threadId, threadId),
          gt(chatStateQueue.expiresAt, now),
        ),
      );
    return rows[0]?.depth ?? 0;
  }
}

export function createSqliteChatState(options: { db: Db; keyPrefix?: string }) {
  return new SqliteChatStateAdapter(options);
}
