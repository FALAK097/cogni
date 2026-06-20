export const conversationStatuses = ["OPEN", "ASSIGNED", "ESCALATED", "CLOSED"] as const;

export type ConversationStatus = (typeof conversationStatuses)[number];

export function isConversationStatus(value: string): value is ConversationStatus {
  return conversationStatuses.some((status) => status === value);
}

export const statusLabels: Record<ConversationStatus, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  ESCALATED: "Escalated",
  CLOSED: "Closed",
};
