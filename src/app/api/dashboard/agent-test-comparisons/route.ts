import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

import {
  AgentTestComparisonOriginError,
  AgentTestComparisonUnavailableError,
  replayAgentTestComparison,
} from "@/features/agent-tests/server/comparisons";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { readBoundedJson } from "@/lib/http/read-bounded-json";
import { agentTestComparison } from "@/lib/db/schema";

const privateNoStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };
const replayInputSchema = z.object({
  improvementId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
});

export async function GET() {
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can view replay comparisons." },
      { status: 403, headers: privateNoStoreHeaders },
    );
  }
  const comparisons = await db
    .select({
      id: agentTestComparison.id,
      improvementId: agentTestComparison.improvementId,
      caseSnapshot: agentTestComparison.caseSnapshot,
      baselineReferences: agentTestComparison.baselineReferences,
      replayReferences: agentTestComparison.replayReferences,
      baselineOutcome: agentTestComparison.baselineOutcome,
      replayOutcome: agentTestComparison.replayOutcome,
      replayStatus: agentTestComparison.replayStatus,
      status: agentTestComparison.status,
      createdAt: agentTestComparison.createdAt,
      completedAt: agentTestComparison.completedAt,
    })
    .from(agentTestComparison)
    .where(eq(agentTestComparison.workspaceId, workspace.id))
    .orderBy(desc(agentTestComparison.createdAt), desc(agentTestComparison.id))
    .limit(100);
  return NextResponse.json({ comparisons }, { headers: privateNoStoreHeaders });
}

export async function POST(request: Request) {
  const { workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can replay a saved check." },
      { status: 403, headers: privateNoStoreHeaders },
    );
  }
  const body = await readBoundedJson(request, 2_048);
  if (!body.ok) {
    return NextResponse.json(
      { error: "Replay details are invalid." },
      { status: body.reason === "too-large" ? 413 : 400, headers: privateNoStoreHeaders },
    );
  }
  const parsed = replayInputSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Replay details are invalid." },
      { status: 400, headers: privateNoStoreHeaders },
    );
  }
  try {
    const result = await replayAgentTestComparison({
      workspaceId: workspace.id,
      membershipId: membership.id,
      improvementId: parsed.data.improvementId,
      idempotencyKey: parsed.data.idempotencyKey,
      origin: new URL(request.url).origin,
      cookie: request.headers.get("cookie"),
    });
    if (!result) {
      return NextResponse.json(
        { error: "The saved check is unavailable." },
        { status: 404, headers: privateNoStoreHeaders },
      );
    }
    return NextResponse.json(
      {
        comparison: result.comparison,
        // Deliberately transient: answer text is never stored in the comparison table.
        answerText: result.answerText,
        replayed: result.replayed,
      },
      {
        status: result.comparison.status === "PENDING" ? 202 : 200,
        headers: privateNoStoreHeaders,
      },
    );
  } catch (error) {
    if (error instanceof AgentTestComparisonOriginError) {
      return NextResponse.json(
        { error: error.message },
        { status: 503, headers: privateNoStoreHeaders },
      );
    }
    if (error instanceof AgentTestComparisonUnavailableError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: privateNoStoreHeaders },
      );
    }
    throw error;
  }
}
