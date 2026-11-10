import { NextResponse } from "next/server";

import { createAgentTestImprovementSchema } from "@/features/agent-tests/input";
import {
  AgentTestImprovementConflictError,
  AgentTestImprovementSourceUnavailableError,
  createAgentTestImprovement,
  listAgentTestImprovements,
} from "@/features/agent-tests/server/improvements";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { readBoundedJson } from "@/lib/http/read-bounded-json";

const privateNoStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const { workspace } = await requireDashboardContext();
  const items = await listAgentTestImprovements(workspace.id);
  return NextResponse.json({ items }, { headers: privateNoStoreHeaders });
}

export async function POST(request: Request) {
  const { workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can submit agent-test improvements." },
      { status: 403, headers: privateNoStoreHeaders },
    );
  }
  const body = await readBoundedJson(request, 8_192);
  if (!body.ok) {
    return NextResponse.json(
      { error: "Improvement details are invalid or too large." },
      { status: body.reason === "too-large" ? 413 : 400, headers: privateNoStoreHeaders },
    );
  }
  const parsed = createAgentTestImprovementSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Improvement details are invalid." },
      { status: 400, headers: privateNoStoreHeaders },
    );
  }
  try {
    const item = await createAgentTestImprovement(workspace.id, membership.id, parsed.data);
    return NextResponse.json({ item }, { status: 201, headers: privateNoStoreHeaders });
  } catch (error) {
    if (error instanceof AgentTestImprovementSourceUnavailableError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: privateNoStoreHeaders },
      );
    }
    if (error instanceof AgentTestImprovementConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: privateNoStoreHeaders },
      );
    }
    throw error;
  }
}
