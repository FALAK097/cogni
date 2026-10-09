const maxCursor = BigInt("9223372036854775807");
const cursorPattern = /^(0|[1-9]\d{0,18})$/;

export type InboxConversationEventsResponse = {
  events: Array<{ cursor: string; conversationId: string }>;
  cursor: string;
  reset: boolean;
};

export function parseInboxConversationEventsResponse(
  value: unknown,
): InboxConversationEventsResponse | null {
  if (!value || typeof value !== "object") return null;
  const response = value as Record<string, unknown>;
  if (
    typeof response.cursor !== "string" ||
    !cursorPattern.test(response.cursor) ||
    BigInt(response.cursor) > maxCursor ||
    typeof response.reset !== "boolean" ||
    !Array.isArray(response.events)
  ) {
    return null;
  }

  let previousCursor = BigInt(0);
  const events: InboxConversationEventsResponse["events"] = [];
  for (const event of response.events) {
    if (!event || typeof event !== "object") return null;
    const candidate = event as Record<string, unknown>;
    if (
      typeof candidate.cursor !== "string" ||
      !cursorPattern.test(candidate.cursor) ||
      typeof candidate.conversationId !== "string" ||
      candidate.conversationId.length === 0
    ) {
      return null;
    }
    const cursor = BigInt(candidate.cursor);
    if (cursor > maxCursor || cursor <= previousCursor || cursor > BigInt(response.cursor))
      return null;
    previousCursor = cursor;
    events.push({ cursor: candidate.cursor, conversationId: candidate.conversationId });
  }

  if (response.reset && events.length > 0) return null;
  return { events, cursor: response.cursor, reset: response.reset };
}
