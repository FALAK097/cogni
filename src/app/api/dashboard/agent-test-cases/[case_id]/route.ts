import { NextResponse } from "next/server";
import { z } from "zod";

import { agentTestCaseInputSchema } from "@/features/agent-tests/input";
import {
  AgentTestCaseTitleConflictError,
  deleteAgentTestCase,
  updateAgentTestCase,
} from "@/features/agent-tests/server/cases";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

async function getCaseId(context: { params: Promise<{ case_id: string }> }) {
  const { case_id: caseId } = await context.params;
  return z.string().uuid().safeParse(caseId).success ? caseId : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ case_id: string }> }) {
  const { workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can manage agent tests." },
      { status: 403 },
    );
  }
  const caseId = await getCaseId(context);
  if (!caseId) return NextResponse.json({ error: "Test not found." }, { status: 404 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = agentTestCaseInputSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Test details are invalid." }, { status: 400 });
  try {
    const testCase = await updateAgentTestCase(workspace.id, caseId, parsed.data);
    if (!testCase) return NextResponse.json({ error: "Test not found." }, { status: 404 });
    return NextResponse.json({ case: testCase });
  } catch (error) {
    if (error instanceof AgentTestCaseTitleConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ case_id: string }> }) {
  const { workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can manage agent tests." },
      { status: 403 },
    );
  }
  const caseId = await getCaseId(context);
  if (!caseId) return NextResponse.json({ error: "Test not found." }, { status: 404 });
  const deleted = await deleteAgentTestCase(workspace.id, caseId);
  if (!deleted) return NextResponse.json({ error: "Test not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
