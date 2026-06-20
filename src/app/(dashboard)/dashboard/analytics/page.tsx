import type { Metadata } from "next";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata: Metadata = {
  title: "Analytics",
};

const trackedStatuses = ["OPEN", "ASSIGNED", "ESCALATED", "CLOSED"] as const;

export default async function AnalyticsPage() {
  const { db, workspace } = await requireDashboardContext();

  const [
    statusCounts,
    messageCount,
    contactCount,
    documentCount,
    aiMessageCount,
    escalationCount,
    echoSessions,
    echoLeads,
    feedbackUp,
    feedbackDown,
  ] = await Promise.all([
    db.conversation.groupBy({
      by: ["status"],
      where: { workspaceId: workspace.id },
      _count: { _all: true },
    }),
    db.message.count({
      where: { conversation: { workspaceId: workspace.id } },
    }),
    db.contact.count({
      where: { workspaceId: workspace.id },
    }),
    db.document.count({
      where: { workspaceId: workspace.id },
    }),
    db.message.count({
      where: {
        conversation: { workspaceId: workspace.id },
        authorType: "AI",
      },
    }),
    db.conversation.count({
      where: { workspaceId: workspace.id, status: "ESCALATED" },
    }),
    db.visitorSession.count({ where: { widget: { workspaceId: workspace.id } } }),
    db.lead.count({ where: { workspaceId: workspace.id, source: "ECHO_WIDGET" } }),
    db.messageFeedback.count({
      where: { feedback: "up", visitorSession: { widget: { workspaceId: workspace.id } } },
    }),
    db.messageFeedback.count({
      where: { feedback: "down", visitorSession: { widget: { workspaceId: workspace.id } } },
    }),
  ]);

  const statusMap = new Map(statusCounts.map((item) => [item.status, item._count._all]));

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
    { label: "Widget sessions", value: echoSessions },
    { label: "Widget leads", value: echoLeads },
    { label: "Widget feedback (up)", value: feedbackUp },
    { label: "Widget feedback (down)", value: feedbackDown },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <section>
        <p className="text-sm text-muted-foreground">Workspace health</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Analytics</h1>
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
