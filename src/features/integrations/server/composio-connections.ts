import "server-only";

import { Composio } from "@composio/core";

import { env } from "@/lib/env/server";

export const COMPOSIO_TOOLKITS = {
  GMAIL: "gmail",
  GOOGLE_CALENDAR: "googlecalendar",
  SLACK: "slack",
  DISCORD: "discord",
  GCHAT: "googlechat",
  WHATSAPP: "whatsapp",
  TEAMS: "microsoft_teams",
} as const;

export type ComposioProvider = keyof typeof COMPOSIO_TOOLKITS;

export function createComposioClient() {
  if (!env.COMPOSIO_API_KEY) {
    throw new Error("Composio is not configured. Add COMPOSIO_API_KEY to the server environment.");
  }
  return new Composio({ apiKey: env.COMPOSIO_API_KEY });
}

export async function getOrCreateManagedAuthConfig(composio: Composio, toolkit: string) {
  const existing = await composio.authConfigs.list({
    toolkit,
    isComposioManaged: true,
    showDisabled: false,
    limit: 1,
  });
  const authConfig = existing.items[0];
  if (authConfig) return authConfig.id;

  const created = await composio.authConfigs.create(toolkit, {
    type: "use_composio_managed_auth",
    name: `Cogni ${toolkit} connection`,
  });
  return created.id;
}
