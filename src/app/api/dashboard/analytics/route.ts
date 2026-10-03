import { getDashboardAnalytics } from "@/features/analytics/server/dashboard-analytics";
import { InvalidAnalyticsDateRangeError } from "@/features/analytics/date-range";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  try {
    const analytics = await getDashboardAnalytics(
      db,
      workspace.id,
      startDate,
      endDate,
      workspace.timezone,
    );
    return Response.json(analytics);
  } catch (error) {
    if (error instanceof InvalidAnalyticsDateRangeError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
