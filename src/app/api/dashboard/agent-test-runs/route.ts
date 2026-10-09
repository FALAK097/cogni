import {
  InvalidAnalyticsDateRangeError,
  resolveAnalyticsDateRange,
} from "@/features/analytics/date-range";
import { agentTestRunInputSchema } from "@/features/agent-tests/input";
import {
  AgentTestRunConflictError,
  AgentTestSuiteChangedError,
  hasAgentTestRuns,
  listAgentTestRuns,
  recordAgentTestRun,
} from "@/features/agent-tests/server/runs";
import { readBoundedJson } from "@/lib/http/read-bounded-json";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

const privateNoStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const url = new URL(request.url);
  try {
    const range = resolveAnalyticsDateRange(
      url.searchParams.get("startDate"),
      url.searchParams.get("endDate"),
      workspace.timezone,
    );
    const [runs, hasAnyRuns] = await Promise.all([
      listAgentTestRuns(workspace.id, range.startAt, range.endBefore, db),
      hasAgentTestRuns(workspace.id, db),
    ]);
    return Response.json({ runs, hasAnyRuns }, { headers: privateNoStoreHeaders });
  } catch (error) {
    if (error instanceof InvalidAnalyticsDateRangeError) {
      return Response.json(
        { error: error.message },
        { status: 400, headers: privateNoStoreHeaders },
      );
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return Response.json(
      { error: "Only workspace owners can run saved tests." },
      { status: 403, headers: privateNoStoreHeaders },
    );
  }

  const body = await readBoundedJson(request, 1_048_576);
  if (!body.ok) {
    return Response.json(
      {
        error:
          body.reason === "too-large"
            ? "Test run results are too large."
            : "Test run results are invalid.",
      },
      { status: body.reason === "too-large" ? 413 : 400, headers: privateNoStoreHeaders },
    );
  }
  const parsed = agentTestRunInputSchema.safeParse(body.value);
  if (!parsed.success) {
    return Response.json(
      { error: "Test run results are invalid." },
      { status: 400, headers: privateNoStoreHeaders },
    );
  }

  try {
    const run = await recordAgentTestRun(workspace.id, membership.id, parsed.data, db);
    return Response.json({ run }, { status: 201, headers: privateNoStoreHeaders });
  } catch (error) {
    if (error instanceof AgentTestSuiteChangedError || error instanceof AgentTestRunConflictError) {
      return Response.json(
        { error: error.message },
        { status: 409, headers: privateNoStoreHeaders },
      );
    }
    throw error;
  }
}
