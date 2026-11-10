import { NextResponse } from "next/server";
import type { VerifyWebhookResult } from "@composio/core";

import { createComposioClient } from "@/features/integrations/server/composio-connections";
import { getDb } from "@/lib/db/client";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { env } from "@/lib/env/server";
import { logError } from "@/lib/logging/logger";

function stringField(payload: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

export async function POST(request: Request) {
  if (!env.COMPOSIO_WEBHOOK_SECRET) {
    logError("composio.webhook.not_configured");
    return NextResponse.json({ error: "Webhook verification is not configured." }, { status: 503 });
  }

  let event: VerifyWebhookResult;
  try {
    event = await createComposioClient().triggers.parse(request, {
      verifySecret: env.COMPOSIO_WEBHOOK_SECRET,
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const incoming = event.payload;
  const accountId = incoming.metadata.connectedAccount.id;
  const db = getDb();
  const integration = await db.query.integration.findFirst({
    where: (fields, { and, eq }) =>
      and(eq(fields.connectedAccountId, accountId), eq(fields.status, "CONNECTED")),
  });
  if (!integration) {
    return NextResponse.json({ error: "Connected account is not active." }, { status: 404 });
  }
  if (incoming.userId !== integration.workspaceId) {
    logError("composio.webhook.workspace_mismatch", { integrationId: integration.id });
    return NextResponse.json({ error: "Webhook workspace does not match." }, { status: 403 });
  }

  const eventType = `composio.${incoming.toolkitSlug}.${incoming.triggerSlug}`.toLowerCase();
  const existing = await db.query.domainEvent.findFirst({
    where: (fields, { and, eq }) =>
      and(
        eq(fields.workspaceId, integration.workspaceId),
        eq(fields.type, eventType),
        eq(fields.entityId, incoming.uuid),
      ),
    columns: { id: true },
  });
  if (existing) return NextResponse.json({ ok: true, duplicate: true });

  const payload = incoming.payload ?? {};
  await emitDomainEvent({
    db,
    workspaceId: integration.workspaceId,
    type: eventType,
    entityId: incoming.uuid,
    payload: {
      integrationId: integration.id,
      status: stringField(payload, "status", "message_status"),
      providerMessageId: stringField(payload, "message_id", "messageId", "id"),
      occurredAt: stringField(payload, "timestamp", "occurred_at", "updated_at"),
    },
  });

  return NextResponse.json({ ok: true });
}
