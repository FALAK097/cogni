import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { env } from "@/lib/env/server";

const bootstrapLifetimeSeconds = 60 * 60;

const bootstrapClaimsSchema = z.object({
  widgetId: z.string().min(1),
  publicKey: z.string().min(1),
  browserSessionId: z.string().uuid(),
  visitorId: z.string().uuid().nullable(),
  hostname: z.string().min(1).max(253),
  expiresAt: z.number().int().positive(),
});

export type WidgetBootstrapClaims = z.infer<typeof bootstrapClaimsSchema>;

function signature(payload: string) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(payload).digest("base64url");
}

export function createWidgetBootstrapToken(claims: Omit<WidgetBootstrapClaims, "expiresAt">) {
  const payload = Buffer.from(
    JSON.stringify({
      ...claims,
      expiresAt: Math.floor(Date.now() / 1000) + bootstrapLifetimeSeconds,
    }),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyWidgetBootstrapToken(token: string) {
  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra) return null;

  const expectedSignature = signature(payload);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const parsed = bootstrapClaimsSchema.safeParse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    if (!parsed.success || parsed.data.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
