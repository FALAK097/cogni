import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import {
  COMPOSIO_TOOLKITS,
  createComposioClient,
  type ComposioProvider,
} from "@/features/integrations/server/composio-connections";
import { integrationTools } from "@/features/integrations/server/tool-registry";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { integration as integrationTable } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ slug: string }> };

const providersBySlug: Record<string, ComposioProvider> = {
  gmail: "GMAIL",
  "google-calendar": "GOOGLE_CALENDAR",
  slack: "SLACK",
  "discord-bot": "DISCORD_BOT",
  "google-chat": "GCHAT",
  whatsapp: "WHATSAPP",
  "microsoft-teams": "TEAMS",
};

export async function GET(_request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { slug } = await context.params;
  const provider = providersBySlug[slug];
  if (!provider) return NextResponse.json({ error: "Integration not found." }, { status: 404 });

  const integration = await db.query.integration.findFirst({
    where: (fields, { and, eq }) =>
      and(eq(fields.workspaceId, workspace.id), eq(fields.provider, provider)),
  });
  if (!integration) {
    return NextResponse.json({ error: "Integration is not connected." }, { status: 404 });
  }

  let providerStatus: string | null = null;
  let healthError = integration.lastError;
  if (integration.connectedAccountId) {
    try {
      const account = await createComposioClient().connectedAccounts.get(
        integration.connectedAccountId,
        { signal: AbortSignal.timeout(5_000) },
      );
      const toolkitMatches = account.toolkit.slug === COMPOSIO_TOOLKITS[provider];
      providerStatus = account.status;
      if (!toolkitMatches) healthError = "Connected account toolkit does not match this app.";
      else if (account.status === "ACTIVE") healthError = null;
      else healthError = `Provider connection is ${account.status.toLowerCase()}.`;
    } catch {
      healthError = "Provider health check failed. Reconnect the integration or try again.";
    }
  } else {
    healthError = "Connected account is missing. Reconnect the integration.";
  }
  const checkedAt = new Date().toISOString();
  const healthStatus = healthError ? "ERROR" : "CONNECTED";
  await db
    .update(integrationTable)
    .set({
      status: healthStatus,
      lastHealthCheckAt: checkedAt,
      lastError: healthError,
      updatedAt: checkedAt,
    })
    .where(
      and(eq(integrationTable.id, integration.id), eq(integrationTable.workspaceId, workspace.id)),
    );

  const actions = await db.query.integrationAction.findMany({
    where: (fields, { and, eq }) =>
      and(eq(fields.workspaceId, workspace.id), eq(fields.provider, provider)),
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    limit: 100,
    columns: {
      id: true,
      actionType: true,
      status: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    integration: {
      id: integration.id,
      slug,
      provider,
      status: healthStatus,
      providerStatus,
      toolkit: COMPOSIO_TOOLKITS[provider],
      connectedAt: integration.updatedAt,
      lastHealthCheckAt: checkedAt,
      lastError: healthError,
      capabilities: integrationTools
        .filter((tool) => tool.provider === provider)
        .map((tool) => ({
          actionType: tool.actionType,
          label: tool.label,
          riskLevel: tool.riskLevel,
          requiresApproval: tool.requiresApproval,
        })),
    },
    actions,
  });
}
