import { createDiscordAdapter } from "@chat-adapter/discord";
import { createGoogleChatAdapter } from "@chat-adapter/gchat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createPostgresState } from "@chat-adapter/state-pg";
import { createTeamsAdapter } from "@chat-adapter/teams";
import { createWhatsAppAdapter } from "@chat-adapter/whatsapp";
import { Chat, type Adapter, type Message, type Thread } from "chat";

import {
  answerOmnichannelMessage,
  ingestOmnichannelMessage,
  type SupportedChatChannel,
} from "@/features/integrations/server/omnichannel";
import type { Db } from "@/lib/db/client";
import { env } from "@/lib/env/server";

export const chatSdkChannelSchema = ["slack", "discord", "gchat", "teams", "whatsapp"] as const;
export type ChatSdkChannel = (typeof chatSdkChannelSchema)[number];

function channelName(channel: ChatSdkChannel): SupportedChatChannel {
  return channel.toUpperCase() as SupportedChatChannel;
}

function createAdapter(channel: ChatSdkChannel): Adapter {
  if (channel === "slack") return createSlackAdapter();
  if (channel === "discord") {
    if (!env.DISCORD_CLIENT_ID || !env.DISCORD_BOT_TOKEN || !env.DISCORD_PUBLIC_KEY) {
      throw new Error(
        "Discord inbound messaging requires DISCORD_CLIENT_ID, DISCORD_BOT_TOKEN, and DISCORD_PUBLIC_KEY.",
      );
    }
    return createDiscordAdapter({
      applicationId: env.DISCORD_CLIENT_ID,
      botToken: env.DISCORD_BOT_TOKEN,
      publicKey: env.DISCORD_PUBLIC_KEY,
    });
  }
  if (channel === "gchat") return createGoogleChatAdapter();
  if (channel === "teams") return createTeamsAdapter({ appType: "SingleTenant" });
  return createWhatsAppAdapter();
}

export function createChannelBot({
  channel,
  db,
  workspaceId,
  integrationId,
}: {
  channel: ChatSdkChannel;
  db: Db;
  workspaceId: string;
  integrationId: string;
}) {
  const adapter = createAdapter(channel);
  const bot = new Chat({
    userName: "cogni",
    adapters: { [channel]: adapter },
    state: createPostgresState({
      url: env.DATABASE_URL,
      keyPrefix: `cogni:${workspaceId}:${integrationId}`,
    }),
    concurrency: "queue",
    logger: "info",
  });

  async function handleMessage(thread: Thread, message: Message, subscribe: boolean) {
    if (subscribe) await thread.subscribe();
    await thread.startTyping("Thinking…");
    const ingested = await ingestOmnichannelMessage({
      db,
      workspaceId,
      integrationId,
      channel: channelName(channel),
      externalThreadId: thread.id,
      externalMessageId: message.id,
      externalUserId: message.author.userId,
      userName: message.author.fullName || message.author.userName,
      text: message.text,
    });
    const answer = await answerOmnichannelMessage({
      db,
      workspaceId: ingested.connection.workspaceId,
      conversationId: ingested.conversation.id,
      text: message.text,
    });
    await thread.post(answer);
  }

  bot.onDirectMessage(async (thread, message) => handleMessage(thread, message, true));
  bot.onNewMention(async (thread, message) => handleMessage(thread, message, true));
  bot.onSubscribedMessage(async (thread, message) => handleMessage(thread, message, false));
  return bot;
}

export function isChatSdkChannel(value: string): value is ChatSdkChannel {
  return chatSdkChannelSchema.some((channel) => channel === value);
}

export async function postChannelReply({
  channel,
  externalThreadId,
  db,
  workspaceId,
  integrationId,
  text,
}: {
  channel: ChatSdkChannel;
  externalThreadId: string;
  db: Db;
  workspaceId: string;
  integrationId: string;
  text: string;
}) {
  const bot = createChannelBot({ channel, db, workspaceId, integrationId });
  await bot.initialize();
  try {
    await bot.thread(externalThreadId).post(text);
  } finally {
    await bot.shutdown();
  }
}
