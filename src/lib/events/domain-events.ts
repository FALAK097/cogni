import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

import { logInfo } from "@/lib/logging/logger";

export async function emitDomainEvent({
  db,
  workspaceId,
  type,
  entityId,
  payload = {},
}: {
  db: PrismaClient;
  workspaceId: string;
  type: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}) {
  await db.domainEvent.create({
    data: {
      workspaceId,
      type,
      entityId,
      payload: JSON.stringify(payload),
    },
  });

  logInfo("domain.event.emitted", { workspaceId, type, entityId });
}
