import type { Db } from "@/lib/db/client";
import { domainEvent } from "@/lib/db/schema";
import { logInfo } from "@/lib/logging/logger";

export async function emitDomainEvent({
  db,
  workspaceId,
  type,
  entityId,
  payload = {},
}: {
  db: Db;
  workspaceId: string;
  type: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}) {
  await db.insert(domainEvent).values({
    id: crypto.randomUUID(),
    workspaceId,
    type,
    entityId,
    payload: JSON.stringify(payload),
  });

  logInfo("domain.event.emitted", { workspaceId, type, entityId });
}
