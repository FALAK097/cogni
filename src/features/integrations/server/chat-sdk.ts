import { createDiscordAdapter } from "@chat-adapter/discord";
import { createGoogleChatAdapter } from "@chat-adapter/gchat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createTeamsAdapter } from "@chat-adapter/teams";
import { createWhatsAppAdapter } from "@chat-adapter/whatsapp";
import { Chat, type Adapter, type Message, type Thread } from "chat";
import { createCloudflareState, type ChatStateDO } from "chat-state-cloudflare-do";

import {
  answerOmnichannelMessage,
  ingestOmnichannelMessage,
  type SupportedChatChannel,
} from "@/features/integrations/server/omnichannel";
import type { Db } from "@/lib/db/client";

export const chatSdkChannelSchema = ["slack", "discord", "gchat", "teams", "whatsapp"] as const;
export type ChatSdkChannel = (typeof chatSdkChannelSchema)[number];

function channelName(channel: ChatSdkChannel): SupportedChatChannel {
  return channel.toUpperCase() as SupportedChatChannel;
}

function createAdapter(channel: ChatSdkChannel): Adapter {
  if (channel === "slack") return createSlackAdapter();
  if (channel === "discord") return createDiscordAdapter();
  if (channel === "gchat") return createGoogleChatAdapter();
  if (channel === "teams") return createTeamsAdapter({ appType: "SingleTenant" });
  return createWhatsAppAdapter();
}

export function createChannelBot({
  channel,
  namespace,
  db,
  workspaceId,
  integrationId,
}: {
  channel: ChatSdkChannel;
  namespace: DurableObjectNamespace<ChatStateDO>;
  db: Db;
  workspaceId: string;
  integrationId: string;
}) {
  const adapter = createAdapter(channel);
  const bot = new Chat({
    userName: "widget",
    adapters: { [channel]: adapter },
    state: createCloudflareState({
      namespace,
      shardKey: (threadId) => threadId.split(":")[0] ?? "default",
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
  namespace,
  db,
  workspaceId,
  integrationId,
  text,
}: {
  channel: ChatSdkChannel;
  externalThreadId: string;
  namespace: DurableObjectNamespace<ChatStateDO>;
  db: Db;
  workspaceId: string;
  integrationId: string;
  text: string;
}) {
  const bot = createChannelBot({ channel, namespace, db, workspaceId, integrationId });
  await bot.initialize();
  try {
    await bot.thread(externalThreadId).post(text);
  } finally {
    await bot.shutdown();
  }
}
