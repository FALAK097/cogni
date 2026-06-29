import "server-only";

import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/client";
import { integrationAction as integrationActionTable } from "@/lib/db/schema";

export async function executeIntegrationAction({
  db,
  workspaceId,
  provider,
  actionType,
  payload,
  requestedById,
  idempotencyKey = randomUUID(),
}: {
  db: Db;
  workspaceId: string;
  provider: string;
  actionType: string;
  payload: Record<string, unknown>;
  requestedById?: string;
  idempotencyKey?: string;
}) {
  const existing = await db.query.integrationAction.findFirst({
    where: (fields, { eq }) => eq(fields.idempotencyKey, idempotencyKey),
  });
  if (existing) return existing;

  const integration = await db.query.integration.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.workspaceId, workspaceId), eq(fields.provider, provider)),
  });

  if (!integration || integration.status !== "CONNECTED") {
    const [failedAction] = await db
      .insert(integrationActionTable)
      .values({
        id: randomUUID(),
        workspaceId,
        provider,
        actionType,
        idempotencyKey,
        requestedById,
        status: "FAILED",
        payload: JSON.stringify(payload),
        errorMessage: `${provider} is not connected.`,
        updatedAt: new Date().toISOString(),
      })
      .returning();
    return failedAction;
  }

  const [action] = await db
    .insert(integrationActionTable)
    .values({
      id: randomUUID(),
      workspaceId,
      provider,
      actionType,
      idempotencyKey,
      requestedById,
      payload: JSON.stringify(payload),
      status: "COMPLETED",
      result: JSON.stringify({
        message: `${actionType} queued for ${provider}.`,
        simulated: true,
      }),
      updatedAt: new Date().toISOString(),
    })
    .returning();

  return action;
}
