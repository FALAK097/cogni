export function resolveTranscriptScroll({
  stickToBottom,
  previousMessageCount,
  messageCount,
}: {
  stickToBottom: boolean;
  previousMessageCount: number | null;
  messageCount: number;
}) {
  return {
    scrollToBottom: stickToBottom,
    announceNewMessages:
      !stickToBottom && previousMessageCount !== null && messageCount > previousMessageCount,
  };
}
