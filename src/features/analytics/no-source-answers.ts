import type { MessageJson } from "@/features/conversations/server/conversation-service";
import type { KnowledgeGapObservation } from "@/features/analytics/knowledge-gaps";

/**
 * Report only new-format AI replies whose exact visitor turn is known and whose
 * completed retrieval explicitly returned no matches. Legacy messages and
 * handoff/fallback replies do not carry this evidence and are excluded.
 */
export function collectNoSourceMatchQuestions(
  conversationId: string,
  messages: MessageJson[],
): KnowledgeGapObservation[] {
  const visitorMessages = new Map(
    messages
      .filter((message) => message.authorType === "VISITOR" && message.body.trim())
      .map((message) => [message.id, message] as const),
  );

  return messages.flatMap((message) => {
    if (
      message.authorType !== "AI" ||
      message.visibility === "INTERNAL" ||
      message.retrievalOutcome !== "NO_MATCH" ||
      !message.replyToMessageId
    ) {
      return [];
    }

    const visitorMessage = visitorMessages.get(message.replyToMessageId);
    if (!visitorMessage || !Number.isFinite(Date.parse(message.createdAt))) return [];

    return [
      {
        conversationId,
        question: visitorMessage.body.trim().slice(0, 500),
        askedAt: message.createdAt,
        signal: "NO_SOURCE_MATCH" as const,
      },
    ];
  });
}
