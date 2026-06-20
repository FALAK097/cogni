import "server-only";

import { getDb } from "@/lib/db/client";

export async function listWorkflowRuns(workspaceId: string, limit = 50) {
  return getDb().workflowRun.findMany({
    where: { workspaceId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}
