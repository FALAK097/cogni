import { NextResponse } from "next/server";

import { agentTestCaseInputSchema } from "@/features/agent-tests/input";
import {
  AgentTestCaseTitleConflictError,
  createAgentTestCase,
  listAgentTestCases,
} from "@/features/agent-tests/server/cases";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET() {
  const { workspace } = await requireDashboardContext();
  const cases = await listAgentTestCases(workspace.id);
  return NextResponse.json({ cases });
}

export async function POST(request: Request) {
  const { workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can manage agent tests." },
      { status: 403 },
    );
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = agentTestCaseInputSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Test details are invalid." }, { status: 400 });
  try {
    const testCase = await createAgentTestCase(workspace.id, membership.id, parsed.data);
    return NextResponse.json({ case: testCase }, { status: 201 });
  } catch (error) {
    if (error instanceof AgentTestCaseTitleConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
