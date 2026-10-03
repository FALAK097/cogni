import { z } from "zod";

export const conversationRealtimeEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message"),
    conversationId: z.string().min(1),
    messageId: z.string().min(1),
  }),
  z.object({
    type: z.literal("typing"),
    conversationId: z.string().min(1),
    actor: z.enum(["VISITOR", "TEAM", "AI"]),
    active: z.boolean(),
  }),
  z.object({
    type: z.literal("read"),
    conversationId: z.string().min(1),
    actor: z.enum(["VISITOR", "TEAM"]),
  }),
  z.object({
    type: z.literal("state"),
    conversationId: z.string().min(1),
    status: z.string().min(1),
    assignedMemberId: z.string().nullable(),
  }),
  z.object({
    type: z.literal("ai-stream"),
    conversationId: z.string().min(1),
    status: z.enum(["started", "finished", "failed"]),
  }),
]);

export type ConversationRealtimeEvent = z.infer<typeof conversationRealtimeEventSchema>;
