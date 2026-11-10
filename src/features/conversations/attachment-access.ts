export function canVisitorAccessAttachment({
  attachmentWorkspaceId,
  sessionId,
  sessionWorkspaceId,
  conversationWorkspaceId,
  conversationVisitorSessionId,
}: {
  attachmentWorkspaceId: string;
  sessionId: string;
  sessionWorkspaceId: string;
  conversationWorkspaceId: string | null;
  conversationVisitorSessionId: string | null;
}): boolean {
  return (
    attachmentWorkspaceId === sessionWorkspaceId &&
    conversationWorkspaceId === attachmentWorkspaceId &&
    conversationVisitorSessionId === sessionId
  );
}
