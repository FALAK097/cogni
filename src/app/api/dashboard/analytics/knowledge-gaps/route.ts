import { NextResponse } from "next/server";
import { z } from "zod";

import { hashKnowledgeGapQuestion } from "@/features/analytics/knowledge-gaps";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { knowledgeGapReview } from "@/lib/db/schema";

const reviewInput = z
  .object({
    question: z.string().trim().min(1).max(500),
    status: z.enum(["OPEN", "RESOLVED", "IGNORED"]),
  })
  .strict();

export async function PATCH(request: Request) {
  const { db, membership, session, workspace } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can review knowledge gaps." },
      { status: 403 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = reviewInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Knowledge gap details are invalid." }, { status: 400 });
  }

  const questionHash = hashKnowledgeGapQuestion(parsed.data.question);
  const now = new Date().toISOString();
  await db
    .insert(knowledgeGapReview)
    .values({
      workspaceId: workspace.id,
      questionHash,
      status: parsed.data.status,
      reviewedByUserId: session.user.id,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [knowledgeGapReview.workspaceId, knowledgeGapReview.questionHash],
      set: {
        status: parsed.data.status,
        reviewedByUserId: session.user.id,
        updatedAt: now,
      },
    });

  return NextResponse.json({ status: parsed.data.status });
}
