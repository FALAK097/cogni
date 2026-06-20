import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const dateFilter =
    startDate || endDate
      ? {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        }
      : {};

  const [totalSessions, activeSessions, totalLeads, feedbackUp, feedbackDown, sessions] =
    await Promise.all([
      db.visitorSession.count({ where: { widget: { workspaceId: workspace.id }, ...dateFilter } }),
      db.visitorSession.count({
        where: { widget: { workspaceId: workspace.id }, status: "active", ...dateFilter },
      }),
      db.lead.count({ where: { workspaceId: workspace.id, ...dateFilter } }),
      db.messageFeedback.count({
        where: { feedback: "up", visitorSession: { widget: { workspaceId: workspace.id } } },
      }),
      db.messageFeedback.count({
        where: { feedback: "down", visitorSession: { widget: { workspaceId: workspace.id } } },
      }),
      db.visitorSession.findMany({
        where: { widget: { workspaceId: workspace.id }, ...dateFilter },
        select: { country: true, deviceType: true },
        take: 500,
      }),
    ]);

  const countries: Record<string, number> = {};
  const devices: Record<string, number> = {};
  for (const session of sessions) {
    if (session.country) countries[session.country] = (countries[session.country] ?? 0) + 1;
    if (session.deviceType) devices[session.deviceType] = (devices[session.deviceType] ?? 0) + 1;
  }

  return Response.json({
    totalSessions,
    activeSessions,
    totalLeads,
    feedback: { up: feedbackUp, down: feedbackDown },
    visitorsByCountry: countries,
    visitorsByDevice: devices,
  });
}
