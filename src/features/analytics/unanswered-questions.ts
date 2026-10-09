import type { MessageJson } from "@/features/conversations/server/conversation-service";
import type { UnansweredQuestionItem } from "@/features/analytics/types";

const OPEN_QUESTION_AGE_MS = 24 * 60 * 60 * 1_000;

/**
 * Finds visitor turns with no public AI or teammate reply before the next
 * visitor turn. Old open threads are included after 24 hours; closed threads
 * are included immediately. Internal notes never count as replies.
 */
export function collectUnansweredQuestions(
  conversationId: string,
  status: string,
  messages: MessageJson[],
  now = Date.now(),
): Omit<UnansweredQuestionItem, "count">[] {
  const result: Omit<UnansweredQuestionItem, "count">[] = [];
  let pending: MessageJson | null = null;

  for (const message of messages) {
    if (message.authorType === "VISITOR") {
      if (pending) addIfUnanswered(pending);
      pending = message.body.trim() ? message : null;
      continue;
    }

    if (
      pending &&
      (message.authorType === "AI" || message.authorType === "TEAM") &&
      message.visibility !== "INTERNAL" &&
      message.body.trim()
    ) {
      pending = null;
    }
  }

  if (pending) addIfUnanswered(pending);
  return result.sort((a, b) => b.askedAt.localeCompare(a.askedAt));

  function addIfUnanswered(question: MessageJson) {
    const askedAt = question.createdAt;
    const timestamp = Date.parse(askedAt);
    if (!Number.isFinite(timestamp)) return;
    if (status !== "CLOSED" && now - timestamp < OPEN_QUESTION_AGE_MS) {
      return;
    }
    result.push({ conversationId, question: question.body.trim().slice(0, 500), askedAt });
  }
}
