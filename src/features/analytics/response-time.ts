import type { MessageJson } from "@/features/conversations/server/conversation-service";

export function collectAiResponseTimeSamplesMs(messages: readonly MessageJson[]): number[] {
  const responseTimes: number[] = [];
  let pendingVisitorMessageAt: number | null = null;

  for (const message of messages) {
    if (message.visibility === "INTERNAL") continue;

    if (message.authorType === "VISITOR") {
      if (pendingVisitorMessageAt === null) {
        const timestamp = new Date(message.createdAt).getTime();
        if (!Number.isNaN(timestamp)) pendingVisitorMessageAt = timestamp;
      }
      continue;
    }

    if (message.authorType !== "AI" && message.authorType !== "TEAM") continue;
    if (pendingVisitorMessageAt === null) continue;

    const responseAt = new Date(message.createdAt).getTime();
    if (
      message.authorType === "AI" &&
      !Number.isNaN(responseAt) &&
      responseAt >= pendingVisitorMessageAt
    ) {
      responseTimes.push(responseAt - pendingVisitorMessageAt);
    }
    pendingVisitorMessageAt = null;
  }

  return responseTimes;
}

export function averageAiResponseTimeMs(responseTimes: readonly number[]): number | null {
  if (responseTimes.length === 0) return null;
  return (
    responseTimes.reduce((total, responseTime) => total + responseTime, 0) / responseTimes.length
  );
}
