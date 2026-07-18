import { after } from "next/server";

import { createChannelBot, isChatSdkChannel } from "@/features/integrations/server/chat-sdk";
import { getDb } from "@/lib/db/client";

type RouteContext = {
  params: Promise<{ channel: string; integrationId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { channel, integrationId } = await context.params;
  if (!isChatSdkChannel(channel)) {
    return Response.json({ error: "Unknown channel." }, { status: 404 });
  }

  const db = getDb();
  const integration = await db.query.integration.findFirst({
    where: (fields, { and, eq }) =>
      and(eq(fields.id, integrationId), eq(fields.provider, channel.toUpperCase())),
    columns: { id: true, workspaceId: true, status: true, config: true },
  });
  const token = new URL(request.url).searchParams.get("token");
  const config = integration ? (JSON.parse(integration.config) as { webhookToken?: string }) : {};
  if (!integration || integration.status !== "CONNECTED" || token !== config.webhookToken) {
    return Response.json({ error: "Webhook not found." }, { status: 404 });
  }

  const bot = createChannelBot({
    channel,
    db,
    workspaceId: integration.workspaceId,
    integrationId: integration.id,
  });
  return bot.webhooks[channel](request, { waitUntil: (task) => after(() => task) });
}
