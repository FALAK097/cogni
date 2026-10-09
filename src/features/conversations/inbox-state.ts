export function shouldShowInboxFirstRunState({
  conversationsLoaded,
  conversationCount,
  selectedConversationId,
}: {
  conversationsLoaded: boolean;
  conversationCount: number;
  selectedConversationId: string | null;
}): boolean {
  return conversationsLoaded && conversationCount === 0 && selectedConversationId === null;
}
