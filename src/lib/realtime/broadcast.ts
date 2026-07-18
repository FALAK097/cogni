import "server-only";

import {
  conversationRealtimeEventSchema,
  type ConversationRealtimeEvent,
} from "@/lib/realtime/events";

export async function broadcastConversationEvent(input: ConversationRealtimeEvent) {
  conversationRealtimeEventSchema.parse(input);
  return 0;
}
