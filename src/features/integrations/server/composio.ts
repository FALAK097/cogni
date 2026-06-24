import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { ToolSet } from "ai";

import {
  getComposioClient,
  getComposioWorkspaceUserId,
  isComposioConfigured,
} from "@/lib/composio/client";

const PROVIDER_TOOLKITS = {
  GMAIL: "gmail",
  GOOGLE_CALENDAR: "googlecalendar",
  SLACK: "slack",
} as const;

type SupportedProvider = keyof typeof PROVIDER_TOOLKITS;

function isSupportedProvider(provider: string): provider is SupportedProvider {
  return provider in PROVIDER_TOOLKITS;
}

export function getComposioToolkitForProvider(provider: string) {
  if (!isSupportedProvider(provider)) return null;
  return PROVIDER_TOOLKITS[provider];
}

export async function getComposioToolsForProvider({
  workspaceId,
  provider,
}: {
  workspaceId: string;
  provider: string;
}): Promise<ToolSet> {
  const toolkit = getComposioToolkitForProvider(provider);
  if (!toolkit || !isComposioConfigured()) return {};

  const session = await getComposioClient().create(getComposioWorkspaceUserId(workspaceId), {
    toolkits: [toolkit],
    workbench: { enable: false },
    manageConnections: { enable: false },
  });

  return session.tools();
}

export async function getComposioToolsForWorkspace({
  db,
  workspaceId,
}: {
  db: PrismaClient;
  workspaceId: string;
}): Promise<ToolSet> {
  if (!isComposioConfigured()) return {};

  const toolkits = await getConnectedComposioToolkits({ db, workspaceId });
  if (toolkits.length === 0) return {};

  const session = await getComposioClient().create(getComposioWorkspaceUserId(workspaceId), {
    toolkits,
    workbench: { enable: false },
    manageConnections: { enable: false },
  });

  return session.tools();
}

export async function getConnectedComposioToolkits({
  db,
  workspaceId,
}: {
  db: PrismaClient;
  workspaceId: string;
}) {
  const integrations = await db.integration.findMany({
    where: {
      workspaceId,
      status: "CONNECTED",
      provider: { in: Object.keys(PROVIDER_TOOLKITS) },
    },
    select: { provider: true },
  });

  const toolkits: string[] = [];
  for (const integration of integrations) {
    const toolkit = getComposioToolkitForProvider(integration.provider);
    if (toolkit) toolkits.push(toolkit);
  }

  return [...new Set(toolkits)];
}
