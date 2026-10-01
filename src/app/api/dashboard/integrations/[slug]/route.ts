import { NextResponse } from "next/server";

import {
  COMPOSIO_TOOLKITS,
  createComposioClient,
  getComposioProviderBySlug,
} from "@/features/integrations/server/composio-connections";
import { integrationTools } from "@/features/integrations/server/tool-registry";
import {
  ACTION_OUTCOME_UNKNOWN_MESSAGE,
  getActionStatusForDisplay,
} from "@/features/integrations/action-recovery";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { canManageWorkspace } from "@/lib/auth/permissions";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { db, workspace, membership } = await requireDashboardContext();
  const { slug } = await context.params;
  const provider = getComposioProviderBySlug(slug);
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

  const actions = await db.query.integrationAction.findMany({
    where: (fields, { and, eq }) =>
      and(eq(fields.workspaceId, workspace.id), eq(fields.provider, provider)),
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    limit: 100,
    columns: {
      id: true,
      actionType: true,
      provider: true,
      status: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const visibleActions = actions.map(({ provider: actionProvider, ...action }) => {
    const status = getActionStatusForDisplay(action.status, actionProvider, action.actionType);
    return {
      ...action,
      status,
      errorMessage: status === "UNKNOWN" ? ACTION_OUTCOME_UNKNOWN_MESSAGE : action.errorMessage,
    };
  });
  const config = (() => {
    try {
      const parsed = JSON.parse(integration.config) as unknown;
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  })();
  const webhookToken =
    typeof config.webhookToken === "string" && config.webhookToken.length >= 64
      ? config.webhookToken
      : null;
  const supportsInboundWebhook = ["SLACK", "DISCORD", "GCHAT", "WHATSAPP", "TEAMS"].includes(
    provider,
  );
  const inboundWebhookUrl =
    webhookToken && supportsInboundWebhook
      ? `${new URL(request.url).origin}/api/channels/${provider.toLowerCase()}/${integration.id}/webhook?token=${webhookToken}`
      : null;

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
      inboundWebhookUrl: canManageWorkspace(membership.role) ? inboundWebhookUrl : null,
      capabilities: integrationTools
        .filter((tool) => tool.provider === provider)
        .map((tool) => ({
          actionType: tool.actionType,
          label: tool.label,
          riskLevel: tool.riskLevel,
          requiresApproval: tool.requiresApproval,
        })),
    },
    actions: visibleActions,
  });
}
