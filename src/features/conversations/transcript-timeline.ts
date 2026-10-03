export type InternalTranscriptNote = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
};

export function mergeTranscriptMessages<TMessage extends { id: string; timestamp: string }>(
  messages: readonly TMessage[],
  internalNotes: readonly InternalTranscriptNote[],
) {
  const entries = [
    ...messages.map((message, order) => ({ message, order })),
    ...internalNotes.map((note, order) => ({
      message: {
        id: `internal-note:${note.id}`,
        role: "assistant" as const,
        authorType: "TEAM" as const,
        authorName: note.authorName,
        content: note.body,
        timestamp: note.createdAt,
        visibility: "INTERNAL" as const,
        isInternal: true as const,
      },
      order: messages.length + order,
    })),
  ];

  return entries
    .sort((left, right) => {
      const timeDifference =
        Date.parse(left.message.timestamp) - Date.parse(right.message.timestamp);
      return timeDifference || left.order - right.order;
    })
    .map(({ message }) => message);
}
