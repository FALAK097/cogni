import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { z } from "zod";

import { createWorkflowWithSteps } from "@/lib/workflows/runner";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { chunkArray } from "@/lib/db/utils";

const stepSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["ACTION", "APPROVAL", "MESSAGE", "WAIT"]),
  input: z.record(z.string(), z.unknown()).default({}),
});

const createWorkflowSchema = z.object({
  conversationId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  idempotencyKey: z.string().min(1).max(256),
  input: z.record(z.string(), z.unknown()).default({}),
  steps: z.array(stepSchema).min(1).max(20),
});

export async function GET(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const conversationId = new URL(request.url).searchParams.get("conversationId");
  const runs = await db.query.workflowRun.findMany({
    where: (fields, { eq, and }) =>
      conversationId
        ? and(eq(fields.workspaceId, workspace.id), eq(fields.conversationId, conversationId))
        : eq(fields.workspaceId, workspace.id),
    orderBy: (fields, { desc }) => [desc(fields.startedAt)],
    limit: 100,
  });
  const runIdList = runs.map((run) => run.id);
  const allSteps =
    runIdList.length === 0
      ? []
      : (
          await Promise.all(
            chunkArray(runIdList, 80).map((runIdBatch) =>
              db.query.workflowStep.findMany({
                where: (fields, { and, eq }) =>
                  and(
                    eq(fields.workspaceId, workspace.id),
                    inArray(fields.workflowRunId, runIdBatch),
                  ),
                orderBy: (fields, { asc }) => [asc(fields.position)],
              }),
            ),
          )
        ).flat();
  return NextResponse.json({
    workflows: runs.map((run) => ({
      ...run,
      steps: allSteps.filter((step) => step.workflowRunId === run.id),
    })),
  });
}

export async function POST(request: Request) {
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can create workflows." },
      { status: 403 },
    );
  }
  const parsed = createWorkflowSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const conversation = await db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, parsed.data.conversationId), eq(fields.workspaceId, workspace.id)),
    columns: { id: true },
  });
  if (!conversation)
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const workflow = await createWorkflowWithSteps({
    db,
    workspaceId: workspace.id,
    ...parsed.data,
  });
  return NextResponse.json({ workflow }, { status: 201 });
}
