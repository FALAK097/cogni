import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

import { randomUUID } from "node:crypto";

export async function executeIntegrationAction({
  db,
  workspaceId,
  provider,
  actionType,
  payload,
  requestedById,
  idempotencyKey = randomUUID(),
}: {
  db: PrismaClient;
  workspaceId: string;
  provider: string;
  actionType: string;
  payload: Record<string, unknown>;
  requestedById?: string;
  idempotencyKey?: string;
}) {
  const existing = await db.integrationAction.findUnique({ where: { idempotencyKey } });
  if (existing) return existing;

  const integration = await db.integration.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId,
        provider,
      },
    },
  });

  if (!integration || integration.status !== "CONNECTED") {
    return db.integrationAction.create({
      data: {
        workspaceId,
        provider,
        actionType,
        idempotencyKey,
        requestedById,
        status: "FAILED",
        payload: JSON.stringify(payload),
        errorMessage: `${provider} is not connected.`,
      },
    });
  }

  const action = await db.integrationAction.create({
    data: {
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
    },
  });

  return action;
}
