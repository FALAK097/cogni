import type { Metadata } from "next";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { SITE_NAME } from "@/lib/constants";
import {
  getEngagedVisitorSessionCond,
  getWidgetConversationCond,
} from "@/features/widget/server/widget-data-filters";
import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { and, eq, count, sql } from "drizzle-orm";
import { conversation, contact, document, visitorSession, widget } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: `Dashboard | ${SITE_NAME}`,
};

const trackedStatuses = ["OPEN", "ASSIGNED", "ESCALATED", "CLOSED"] as const;

export default async function DashboardHomePage() {
  const { db, workspace } = await requireDashboardContext();

  const [
    statusCounts,
    contactCountResult,
    documentCountResult,
    escalationCountResult,
    widgetSessionsResult,
    conversations,
  ] = await Promise.all([
    (db as any)
      .select({
        status: conversation.status,
        _count: { _all: count() },
      })
      .from(conversation)
      .where(getWidgetConversationCond(conversation as any, workspace.id))
      .groupBy(conversation.status),
    (db as any)
      .select({ val: count() })
      .from(contact)
      .where(
        and(
          eq(contact.workspaceId, workspace.id),
          sql`exists (
            select 1 from conversation 
            where conversation.contactId = ${contact.id} 
              and conversation.channel = 'WIDGET' 
              and conversation.visitorSessionId is not null
          )`,
        ),
      ),
    (db as any)
      .select({ val: count() })
      .from(document)
      .where(eq(document.workspaceId, workspace.id)),
    (db as any)
      .select({ val: count() })
      .from(conversation)
      .where(
        and(
          getWidgetConversationCond(conversation as any, workspace.id),
          eq(conversation.status, "ESCALATED"),
        ),
      ),
    (db as any)
      .select({ val: count() })
      .from(visitorSession)
      .innerJoin(widget, eq(visitorSession.widgetId, widget.id))
      .where(
        and(
          eq(widget.workspaceId, workspace.id),
          getEngagedVisitorSessionCond(visitorSession as any),
        ),
      ),
    (db as any)
      .select({ messages: conversation.messages })
      .from(conversation)
      .where(getWidgetConversationCond(conversation as any, workspace.id)),
  ]);

  const contactCount = contactCountResult[0]?.val ?? 0;
  const documentCount = documentCountResult[0]?.val ?? 0;
  const escalationCount = escalationCountResult[0]?.val ?? 0;
  const widgetSessions = widgetSessionsResult[0]?.val ?? 0;

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
