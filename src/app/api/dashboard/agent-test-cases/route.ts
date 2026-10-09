import { NextResponse } from "next/server";
import { readBoundedJson } from "@/lib/http/read-bounded-json";

import { agentTestCaseInputSchema } from "@/features/agent-tests/input";
import {
  AgentTestCaseTitleConflictError,
  AgentTestSourceUnavailableError,
  createAgentTestCase,
  listAgentTestCases,
} from "@/features/agent-tests/server/cases";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

const privateNoStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const { workspace } = await requireDashboardContext();
  const cases = await listAgentTestCases(workspace.id);
  return NextResponse.json({ cases }, { headers: privateNoStoreHeaders });
}

export async function POST(request: Request) {
  const { workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can manage agent tests." },
      { status: 403, headers: privateNoStoreHeaders },
    );
  }
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
    const testCase = await createAgentTestCase(workspace.id, membership.id, parsed.data);
    return NextResponse.json({ case: testCase }, { status: 201, headers: privateNoStoreHeaders });
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
