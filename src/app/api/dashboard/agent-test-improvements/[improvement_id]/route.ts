import { NextResponse } from "next/server";

import { updateAgentTestImprovementSchema } from "@/features/agent-tests/input";
import {
  AgentTestImprovementConflictError,
  reviewAgentTestImprovement,
} from "@/features/agent-tests/server/improvements";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { readBoundedJson } from "@/lib/http/read-bounded-json";

const privateNoStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ improvement_id: string }> },
) {
  const { workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can review agent-test improvements." },
      { status: 403, headers: privateNoStoreHeaders },
    );
  }
  const { improvement_id: improvementId } = await params;
  const body = await readBoundedJson(request, 4_096);
  if (!body.ok) {
    return NextResponse.json(
      { error: "Review details are invalid or too large." },
      { status: body.reason === "too-large" ? 413 : 400, headers: privateNoStoreHeaders },
    );
  }
  const parsed = updateAgentTestImprovementSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Review details are invalid." },
      { status: 400, headers: privateNoStoreHeaders },
    );
  }
  try {
    const item = await reviewAgentTestImprovement(
      workspace.id,
      membership.id,
      improvementId,
      parsed.data.status,
      parsed.data.reviewNote ?? null,
    );
    if (!item) {
      return NextResponse.json(
        { error: "This improvement item could not be found in the active workspace." },
        { status: 404, headers: privateNoStoreHeaders },
      );
    }
    return NextResponse.json({ item }, { headers: privateNoStoreHeaders });
  } catch (error) {
    if (error instanceof AgentTestImprovementConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: privateNoStoreHeaders },
      );
    }
    throw error;
  }
}
