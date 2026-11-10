import "server-only";

import { createHmac } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { rateLimitBucket } from "@/lib/db/schema";
import { env } from "@/lib/env/server";

export type RateLimitBudget = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0; retryAfterMs: number; unavailable?: false }
  | { allowed: false; remaining: 0; unavailable: true };

function hashRateLimitKey(key: string) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(key).digest("hex");
}

async function checkSharedRateLimit({ key, limit, windowMs }: RateLimitBudget) {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError("Rate limit must be a positive integer.");
  }
  if (!Number.isSafeInteger(windowMs) || windowMs < 1) {
    throw new RangeError("Rate limit window must be a positive integer.");
  }

  const db = getDb();
  const keyHash = hashRateLimitKey(key);
  const now = new Date();
  const nowIso = now.toISOString();
  const nextResetIso = new Date(now.getTime() + windowMs).toISOString();

  const [bucket] = await db
    .insert(rateLimitBucket)
    .values({ keyHash, count: 1, resetAt: nextResetIso })
    .onConflictDoUpdate({
      target: rateLimitBucket.keyHash,
      set: {
        count: sql`CASE WHEN ${rateLimitBucket.resetAt} <= ${nowIso} THEN 1 ELSE ${rateLimitBucket.count} + 1 END`,
        resetAt: sql`CASE WHEN ${rateLimitBucket.resetAt} <= ${nowIso} THEN ${nextResetIso} ELSE ${rateLimitBucket.resetAt} END`,
      },
      setWhere: sql`${rateLimitBucket.resetAt} <= ${nowIso} OR ${rateLimitBucket.count} < ${limit}`,
    })
    .returning({ count: rateLimitBucket.count, resetAt: rateLimitBucket.resetAt });

  if (bucket) {
    return bucket.count <= limit
      ? { allowed: true as const, remaining: limit - bucket.count }
      : {
          allowed: false as const,
          remaining: 0 as const,
          retryAfterMs: Math.max(1, Date.parse(bucket.resetAt) - Date.now()),
        };
  }

  const [current] = await db
    .select({ resetAt: rateLimitBucket.resetAt })
    .from(rateLimitBucket)
    .where(eq(rateLimitBucket.keyHash, keyHash))
    .limit(1);
  if (!current) throw new Error("Rate limit bucket disappeared during an update.");

  return {
    allowed: false as const,
    remaining: 0 as const,
    retryAfterMs: Math.max(1, Date.parse(current.resetAt) - Date.now()),
  };
}

export async function checkRateLimits(budgets: RateLimitBudget[]): Promise<RateLimitResult> {
  let remaining = Number.MAX_SAFE_INTEGER;

  for (const budget of budgets) {
    let result: Awaited<ReturnType<typeof checkSharedRateLimit>>;
    try {
      result = await checkSharedRateLimit(budget);
    } catch {
      return { allowed: false, remaining: 0, unavailable: true };
    }

    if (!result.allowed) return result;
    remaining = Math.min(remaining, result.remaining);
  }

  return { allowed: true, remaining };
}

export function getTrustedClientIp(headers: Headers) {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedIps = headers.get("x-forwarded-for")?.split(",");
  const lastForwardedIp = forwardedIps?.at(-1)?.trim();
  return lastForwardedIp || "unknown";
}

export async function pruneExpiredRateLimitBuckets(olderThanHours = 24) {
  const db = getDb();
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
  const deleted = await db.execute(sql`
    WITH expired AS (
      SELECT ${rateLimitBucket.keyHash}
      FROM ${rateLimitBucket}
      WHERE ${rateLimitBucket.resetAt} < ${cutoff}
      ORDER BY ${rateLimitBucket.resetAt}
      LIMIT 5000
    )
    DELETE FROM ${rateLimitBucket}
    USING expired
    WHERE ${rateLimitBucket.keyHash} = expired."keyHash"
    RETURNING ${rateLimitBucket.keyHash}
  `);
  return deleted.length;
}
