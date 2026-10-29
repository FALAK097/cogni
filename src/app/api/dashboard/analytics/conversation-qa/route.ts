import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { conversationQaEvaluation } from "@/lib/db/schema";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET() {
  const { db, workspace } = await requireDashboardContext();
  const rows = await db
    .select({
      conversationId: conversationQaEvaluation.conversationId,
      status: conversationQaEvaluation.status,
      helpfulness: conversationQaEvaluation.helpfulness,
      grounding: conversationQaEvaluation.grounding,
      sentiment: conversationQaEvaluation.sentiment,
      topics: conversationQaEvaluation.topics,
      escalationOutcome: conversationQaEvaluation.escalationOutcome,
      reasonCodes: conversationQaEvaluation.reasonCodes,
      lowScore: conversationQaEvaluation.lowScore,
      createdAt: conversationQaEvaluation.createdAt,
    })
    .from(conversationQaEvaluation)
    .where(eq(conversationQaEvaluation.workspaceId, workspace.id))
    .orderBy(desc(conversationQaEvaluation.createdAt))
    .limit(30);

  const completed = rows.filter(
    (row) => row.status === "COMPLETED" && row.helpfulness !== null && row.grounding !== null,
  );
  const denominator = completed.length || 1;
  const helpfulnessAverage =
    completed.reduce((sum, row) => sum + (row.helpfulness ?? 0), 0) / denominator;
  const groundingAverage =
    completed.reduce((sum, row) => sum + (row.grounding ?? 0), 0) / denominator;

  return NextResponse.json(
    {
      label: "Uncalibrated review cues",
      notice: "Not confidence estimates or quality trends.",
      evaluatedCount: completed.length,
      lowScoreCount: completed.filter((row) => row.lowScore === true).length,
      helpfulnessAverage: completed.length ? helpfulnessAverage : null,
      groundingAverage: completed.length ? groundingAverage : null,
      pendingCount: rows.filter((row) => row.status === "QUEUED" || row.status === "RUNNING")
        .length,
      cues: completed.slice(0, 8).map((row) => ({
        conversationId: row.conversationId,
        helpfulness: row.helpfulness,
        grounding: row.grounding,
        sentiment: row.sentiment,
        topics: row.topics,
        escalationOutcome: row.escalationOutcome,
        reasonCodes: row.reasonCodes,
        lowScore: row.lowScore,
        createdAt: row.createdAt,
      })),
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
