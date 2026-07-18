import "server-only";

import { Composio } from "@composio/core";

import { env } from "@/lib/env/server";

export const COMPOSIO_TOOLKITS = {
  GMAIL: "gmail",
  GOOGLE_CALENDAR: "googlecalendar",
  SLACK: "slack",
  DISCORD: "discord",
  DISCORD_BOT: "discordbot",
  GCHAT: "google_chat",
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

export async function getOrCreateAuthConfig(composio: Composio, toolkit: string) {
  const usesCustomGoogleAuth = toolkit === COMPOSIO_TOOLKITS.GCHAT;
  const usesCustomDiscordBotAuth = toolkit === COMPOSIO_TOOLKITS.DISCORD_BOT;
  const existing = await composio.authConfigs.list({
    toolkit,
    isComposioManaged: !usesCustomGoogleAuth && !usesCustomDiscordBotAuth,
    showDisabled: false,
    limit: 1,
  });
  const authConfig = existing.items[0];
  if (authConfig) return authConfig.id;

  if (usesCustomGoogleAuth) {
    const created = await composio.authConfigs.create(toolkit, {
      type: "use_custom_auth",
      authScheme: "OAUTH2",
      name: "Cogni Google Chat connection",
      credentials: {
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
      },
    });
    return created.id;
  }

  if (usesCustomDiscordBotAuth) {
    if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.DISCORD_BOT_TOKEN) {
      throw new Error(
        "Discord Bot requires DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and DISCORD_BOT_TOKEN.",
      );
    }
    const created = await composio.authConfigs.create(toolkit, {
      type: "use_custom_auth",
      authScheme: "OAUTH2",
      name: "Cogni Discord Bot connection",
      credentials: {
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        bearer_token: env.DISCORD_BOT_TOKEN,
        generic_id: env.DISCORD_BOT_PERMISSIONS,
      },
    });
    return created.id;
  }

  const created = await composio.authConfigs.create(toolkit, {
    type: "use_composio_managed_auth",
    name: `Cogni ${toolkit} connection`,
  });
  return created.id;
}
