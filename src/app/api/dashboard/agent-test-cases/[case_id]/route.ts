import { NextResponse } from "next/server";
import { readBoundedJson } from "@/lib/http/read-bounded-json";

import { z } from "zod";

import { agentTestCaseInputSchema } from "@/features/agent-tests/input";
import {
  AgentTestCaseTitleConflictError,
  AgentTestSourceUnavailableError,
  deleteAgentTestCase,
  updateAgentTestCase,
} from "@/features/agent-tests/server/cases";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

const privateNoStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

async function getCaseId(context: { params: Promise<{ case_id: string }> }) {
  const { case_id: caseId } = await context.params;
  return z.string().uuid().safeParse(caseId).success ? caseId : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ case_id: string }> }) {
  const { workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can manage agent tests." },
      { status: 403, headers: privateNoStoreHeaders },
    );
  }
  const caseId = await getCaseId(context);
  if (!caseId)
    return NextResponse.json(
      { error: "Test not found." },
      { status: 404, headers: privateNoStoreHeaders },
    );
  const body = await readBoundedJson(request, 16_384);
  if (!body.ok)
    return NextResponse.json(
      { error: "Test details are invalid or too large." },
      { status: body.reason === "too-large" ? 413 : 400, headers: privateNoStoreHeaders },
    );
  const parsed = agentTestCaseInputSchema.safeParse(body.value);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Test details are invalid." },
      { status: 400, headers: privateNoStoreHeaders },
    );
  try {
    const testCase = await updateAgentTestCase(workspace.id, caseId, parsed.data);
    if (!testCase)
      return NextResponse.json(
        { error: "Test not found." },
        { status: 404, headers: privateNoStoreHeaders },
      );
    return NextResponse.json({ case: testCase }, { headers: privateNoStoreHeaders });
  } catch (error) {
    if (error instanceof AgentTestSourceUnavailableError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: privateNoStoreHeaders },
      );
    }
    if (error instanceof AgentTestCaseTitleConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: privateNoStoreHeaders },
      );
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ case_id: string }> }) {
  const { workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can manage agent tests." },
      { status: 403, headers: privateNoStoreHeaders },
    );
  }
  const caseId = await getCaseId(context);
  if (!caseId)
    return NextResponse.json(
      { error: "Test not found." },
      { status: 404, headers: privateNoStoreHeaders },
    );
  const deleted = await deleteAgentTestCase(workspace.id, caseId);
  if (!deleted)
    return NextResponse.json(
      { error: "Test not found." },
      { status: 404, headers: privateNoStoreHeaders },
    );
  return NextResponse.json({ ok: true }, { headers: privateNoStoreHeaders });
}
