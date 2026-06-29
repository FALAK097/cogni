import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import {
  getEngagedVisitorSessionCond,
  getWidgetConversationCond,
} from "@/features/widget/server/widget-data-filters";
import { and, eq, gte, lte, count } from "drizzle-orm";
import { conversation, visitorSession, widget } from "@/lib/db/schema";

export async function GET(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const sessionDateConds = [];
  const convoDateConds = [];
  if (startDate) {
    const startIso = new Date(startDate).toISOString();
    sessionDateConds.push(gte(visitorSession.createdAt, startIso));
    convoDateConds.push(gte(conversation.createdAt, startIso));
  }
  if (endDate) {
    const endIso = new Date(endDate).toISOString();
    sessionDateConds.push(lte(visitorSession.createdAt, endIso));
    convoDateConds.push(lte(conversation.createdAt, endIso));
  }
  const activeSince = new Date(Date.now() - 30 * 60 * 1000);
  const activeSinceIso = activeSince.toISOString();

  const [totalSessionsResult, activeSessionsResult, sessions, widgetConvos] = await Promise.all([
    db
      .select({ val: count() })
      .from(visitorSession)
      .innerJoin(widget, eq(visitorSession.widgetId, widget.id))
      .where(
        and(
          eq(widget.workspaceId, workspace.id),
          getEngagedVisitorSessionCond(visitorSession),
          ...sessionDateConds,
        ),
      ),
    db
      .select({ val: count() })
      .from(visitorSession)
      .innerJoin(widget, eq(visitorSession.widgetId, widget.id))
      .where(
        and(
          eq(widget.workspaceId, workspace.id),
          eq(visitorSession.status, "active"),
          gte(visitorSession.lastSeenAt, activeSinceIso),
          getEngagedVisitorSessionCond(visitorSession),
          ...sessionDateConds,
        ),
      ),
    db
      .select({ country: visitorSession.country, deviceType: visitorSession.deviceType })
      .from(visitorSession)
      .innerJoin(widget, eq(visitorSession.widgetId, widget.id))
      .where(
        and(
          eq(widget.workspaceId, workspace.id),
          getEngagedVisitorSessionCond(visitorSession),
          ...sessionDateConds,
        ),
      )
      .limit(500),
    db
      .select({ messages: conversation.messages })
      .from(conversation)
      .where(and(getWidgetConversationCond(conversation, workspace.id), ...convoDateConds)),
  ]);

  const totalSessions = totalSessionsResult[0]?.val ?? 0;
  const activeSessions = activeSessionsResult[0]?.val ?? 0;

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
    feedback: { up: feedbackUp, down: feedbackDown },
    visitorsByCountry: countries,
    visitorsByDevice: devices,
  });
}
