import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { ConversationRoom } from "../../../cloudflare-worker";
import {
  conversationRealtimeEventSchema,
  type ConversationRealtimeEvent,
} from "@/lib/realtime/events";

type RealtimeEnv = {
  CONVERSATION_ROOMS?: DurableObjectNamespace<ConversationRoom>;
};

export async function broadcastConversationEvent(input: ConversationRealtimeEvent) {
  const event = conversationRealtimeEventSchema.parse(input);
  try {
    const environment = getCloudflareContext().env as RealtimeEnv;
    const namespace = environment.CONVERSATION_ROOMS;
    if (!namespace) return 0;
    return namespace.getByName(event.conversationId).broadcast(event);
  } catch {
    return 0;
  }
}
