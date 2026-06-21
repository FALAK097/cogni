import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import {
  engagedVisitorSessionWhere,
  widgetLeadWhere,
} from "@/features/widget/server/widget-data-filters";

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
  const activeSince = new Date(Date.now() - 30 * 60 * 1000);

  const [totalSessions, activeSessions, totalLeads, sessions, widgetConvos] = await Promise.all([
    db.visitorSession.count({
      where: {
        widget: { workspaceId: workspace.id },
        ...engagedVisitorSessionWhere,
        ...dateFilter,
      },
    }),
    db.visitorSession.count({
      where: {
        widget: { workspaceId: workspace.id },
        status: "active",
        lastSeenAt: { gte: activeSince },
        ...engagedVisitorSessionWhere,
        ...dateFilter,
      },
    }),
    db.lead.count({ where: { ...widgetLeadWhere(workspace.id), ...dateFilter } }),
    db.visitorSession.findMany({
      where: {
        widget: { workspaceId: workspace.id },
        ...engagedVisitorSessionWhere,
        ...dateFilter,
      },
      select: { country: true, deviceType: true },
      take: 500,
    }),
    db.conversation.findMany({
      where: {
        workspaceId: workspace.id,
        channel: "WIDGET",
        visitorSession: {
          is: {
            hostname: { not: "dashboard-preview" },
            messageCount: { gt: 0 },
          },
        },
        ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
      },
      select: {
        messages: true,
      },
    }),
  ]);

  let feedbackUp = 0;
  let feedbackDown = 0;
  for (const convo of widgetConvos) {
    try {
      const messagesList = JSON.parse(convo.messages || "[]") as MessageJson[];
      for (const m of messagesList) {
        if (m.feedback === "positive") feedbackUp++;
        if (m.feedback === "negative") feedbackDown++;
      }
    } catch {
      // ignore
    }
  }

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
