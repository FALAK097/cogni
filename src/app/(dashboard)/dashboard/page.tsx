import type { Metadata } from "next";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { SITE_NAME } from "@/lib/constants";
import {
  engagedVisitorSessionWhere,
  widgetConversationWhere,
  widgetLeadWhere,
} from "@/features/widget/server/widget-data-filters";
import type { MessageJson } from "@/features/conversations/server/conversation-service";

export const metadata: Metadata = {
  title: `Dashboard | ${SITE_NAME}`,
};

const trackedStatuses = ["OPEN", "ASSIGNED", "ESCALATED", "CLOSED"] as const;

export default async function DashboardHomePage() {
  const { db, workspace } = await requireDashboardContext();

  const [
    statusCounts,
    contactCount,
    documentCount,
    escalationCount,
    widgetSessions,
    widgetLeads,
    conversations,
  ] = await Promise.all([
    db.conversation.groupBy({
      by: ["status"],
      where: widgetConversationWhere(workspace.id),
      _count: { _all: true },
    }),
    db.contact.count({
      where: {
        workspaceId: workspace.id,
        conversations: { some: { channel: "WIDGET", visitorSessionId: { not: null } } },
      },
    }),
    db.document.count({
      where: { workspaceId: workspace.id },
    }),
    db.conversation.count({
      where: { ...widgetConversationWhere(workspace.id), status: "ESCALATED" },
    }),
    db.visitorSession.count({
      where: {
        widget: { workspaceId: workspace.id },
        ...engagedVisitorSessionWhere,
      },
    }),
    db.lead.count({ where: widgetLeadWhere(workspace.id) }),
    db.conversation.findMany({
      where: widgetConversationWhere(workspace.id),
      select: { messages: true },
    }),
  ]);

  let messageCount = 0;
  let aiMessageCount = 0;
  let feedbackUp = 0;
  let feedbackDown = 0;

  for (const convo of conversations) {
    try {
      const messagesList = JSON.parse(convo.messages || "[]") as MessageJson[];
      messageCount += messagesList.length;
      for (const m of messagesList) {
        if (m.authorType === "AI") aiMessageCount++;
        if (m.feedback === "positive") feedbackUp++;
        if (m.feedback === "negative") feedbackDown++;
      }
    } catch {
      // ignore
    }
  }

  const statusMap = new Map<string, number>(
    statusCounts.map((item: { status: string; _count: { _all: number } }) => [
      item.status,
      item._count._all,
    ]),
  );

  const metrics = [
    ...trackedStatuses.map((status) => ({
      label: `Conversations (${status.toLowerCase()})`,
      value: statusMap.get(status) ?? 0,
    })),
    { label: "Messages", value: messageCount },
    { label: "Contacts", value: contactCount },
    { label: "Documents", value: documentCount },
    { label: "AI messages", value: aiMessageCount },
    { label: "Escalations", value: escalationCount },
    { label: "Engaged visitors", value: widgetSessions },
    { label: "Widget leads", value: widgetLeads },
    { label: "Helpful responses", value: feedbackUp },
    { label: "Unhelpful responses", value: feedbackDown },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <section>
        <p className="text-sm text-muted-foreground">Workspace health</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Snapshot metrics for conversation volume, AI output, and knowledge usage.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-3xl border p-5">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-2 font-mono text-3xl font-semibold">{metric.value}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
