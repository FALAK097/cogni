import { listWorkspaceLeads } from "@/features/leads/server/lead-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");

  const result = await listWorkspaceLeads(db, workspace.id, { page, limit });
  return Response.json(result);
}
