import type { MessageJson } from "@/features/conversations/server/conversation-service";
import type { NegativeFeedbackItem } from "@/features/analytics/types";

export function collectNegativeFeedbackItems(
  conversationId: string,
  messages: MessageJson[],
): NegativeFeedbackItem[] {
  const visitorsById = new Map(
    messages
      .filter((message) => message.authorType === "VISITOR")
      .map((message) => [message.id, message] as const),
  );
  let latestVisitorMessage: MessageJson | null = null;
  const items: NegativeFeedbackItem[] = [];

  for (const message of messages) {
    if (message.authorType === "VISITOR") latestVisitorMessage = message;
    if (
      message.authorType !== "AI" ||
      message.visibility === "INTERNAL" ||
      message.feedback !== "negative"
    ) {
      continue;
    }

    const relatedVisitorMessage = message.replyToMessageId
      ? visitorsById.get(message.replyToMessageId)
      : latestVisitorMessage;

    items.push({
      conversationId,
      question: relatedVisitorMessage?.body ?? "Customer question",
      response: message.body.slice(0, 500),
      reason: message.feedbackReason ?? null,
      feedbackAt: message.feedbackAt ?? message.createdAt,
    });
  }

  return items;
}
