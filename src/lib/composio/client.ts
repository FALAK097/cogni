import "server-only";

import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

import { env } from "@/lib/env/server";

function createComposioClient() {
  if (!env.COMPOSIO_API_KEY) {
    throw new Error("COMPOSIO_API_KEY is not configured.");
  }

  return new Composio({
    apiKey: env.COMPOSIO_API_KEY,
    provider: new VercelProvider(),
  });
}

let composioClient: ReturnType<typeof createComposioClient> | null = null;

export function isComposioConfigured() {
  return Boolean(env.COMPOSIO_API_KEY);
}

export function getComposioClient() {
  composioClient ??= createComposioClient();
  return composioClient;
}

export function getComposioUserId(workspaceId: string, userId: string) {
  return `workspace_${workspaceId}:user_${userId}`;
}

export function getComposioWorkspaceUserId(workspaceId: string) {
  return `workspace_${workspaceId}:system`;
}
