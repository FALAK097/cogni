import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AgentTestPublishCheckError,
  recordAgentTestPublishCheckResults,
  startAgentTestPublishCheck,
} from "@/features/agent-tests/server/publish-checks";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { readBoundedJson } from "@/lib/http/read-bounded-json";

const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function POST() {
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can compare a suite for publishing." },
      { status: 403, headers },
    );
  }
  try {
    const check = await startAgentTestPublishCheck(workspace.id, membership.id, db);
    return NextResponse.json({ check }, { status: 201, headers });
  } catch (error) {
    if (error instanceof AgentTestPublishCheckError) {
      return NextResponse.json({ error: error.message }, { status: 409, headers });
    }
    throw error;
  }
}

const resultSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["passed", "mismatch", "error", "not_run"]),
  signedEvidence: z.string().min(1).max(8_000).optional(),
});
const inputSchema = z
  .object({
    checkId: z.string().uuid(),
    variant: z.enum(["baseline", "draft"]),
    results: z.array(resultSchema).min(1).max(5_000),
  })
  .strict();

export async function PUT(request: Request) {
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can compare a suite for publishing." },
      { status: 403, headers },
    );
  }
  const body = await readBoundedJson(request, 1_048_576);
  if (!body.ok) {
    return NextResponse.json(
      {
        error:
          body.reason === "too-large"
            ? "Suite results are too large."
            : "Suite results are invalid.",
      },
      { status: body.reason === "too-large" ? 413 : 400, headers },
    );
  }
  const parsed = inputSchema.safeParse(body.value);
  if (!parsed.success)
    return NextResponse.json({ error: "Suite results are invalid." }, { status: 400, headers });
  try {
    const result = await recordAgentTestPublishCheckResults(
      {
        workspaceId: workspace.id,
        membershipId: membership.id,
        ...parsed.data,
      },
      db,
    );
    return NextResponse.json({ result }, { headers });
  } catch (error) {
    if (error instanceof AgentTestPublishCheckError)
      return NextResponse.json({ error: error.message }, { status: 409, headers });
    throw error;
  }
}
