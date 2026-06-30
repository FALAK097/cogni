import { getDashboardAnalytics } from "@/features/analytics/server/dashboard-analytics";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const analytics = await getDashboardAnalytics(db, workspace.id, startDate, endDate);
  return Response.json(analytics);
}
