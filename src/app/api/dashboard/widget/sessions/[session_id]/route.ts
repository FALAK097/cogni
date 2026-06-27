import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { getEngagedVisitorSessionCond } from "@/features/widget/server/widget-data-filters";
import type { MessageJson } from "@/features/conversations/server/conversation-service";
import {
  visitorSession as visitorSessionTable,
  lead as leadTable,
  conversation as conversationTable,
  contact as contactTable,
} from "@/lib/db/schema";

type RouteContext = { params: Promise<{ session_id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { session_id: sessionId } = await context.params;
  const widget = await db.query.widget.findFirst({
    where: (fields, { eq }) => eq(fields.workspaceId, workspace.id),
  });

  if (!widget) {
    return NextResponse.json({ error: "Widget not found." }, { status: 404 });
  }

  const session = await db.query.visitorSession.findFirst({
    where: (fields, { eq, and }) =>
      and(
        eq(fields.id, sessionId),
        eq(fields.widgetId, widget.id),
        getEngagedVisitorSessionCond(fields as any),
      ),
    with: {
      contact: true,
      widgetLeadCaptures: {
        columns: { leadId: true },
      },
      conversations: {
        where: (fields, { eq, and, like }) =>
          and(eq(fields.channel, "WIDGET"), like(fields.messages, '%"authorType":"VISITOR"%')),
        orderBy: (fields, { desc }) => [desc(fields.lastMessageAt)],
        limit: 1,
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const conversation = session.conversations[0];
  const messagesList = conversation
    ? (JSON.parse(conversation.messages || "[]") as MessageJson[])
    : [];

  const messages = messagesList.map((message) => ({
    id: message.id,
    role: message.authorType === "VISITOR" ? "user" : "assistant",
    content: message.body,
    timestamp: message.createdAt,
    feedback: message.feedback ?? null,
    feedbackReason: message.feedbackReason ?? null,
  }));

  const createdAtIso = session.createdAt
    ? new Date(session.createdAt).toISOString()
    : new Date().toISOString();
  const lastSeenAtIso = session.lastSeenAt
    ? new Date(session.lastSeenAt).toISOString()
    : new Date().toISOString();

  return NextResponse.json({
    id: session.id,
    visitorId: session.visitorId ?? session.id,
    city: session.city,
    country: session.country,
    os: session.os,
    browser: session.browser,
    screenSize: session.screenSize,
    pageUrl: session.pageUrl,
    referrer: session.referrer,
    createdAt: createdAtIso,
    lastActivityAt: lastSeenAtIso,
    ipData: session.ipData ? JSON.parse(session.ipData) : null,
    messages,
    contactName: session.contact?.name,
    contactEmail: session.contact?.email,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { session_id: sessionId } = await context.params;
  const widget = await db.query.widget.findFirst({
    where: (fields, { eq }) => eq(fields.workspaceId, workspace.id),
  });

  if (!widget) {
    return NextResponse.json({ error: "Widget not found." }, { status: 404 });
  }

  const session = await db.query.visitorSession.findFirst({
    where: (fields, { eq, and }) =>
      and(
        eq(fields.id, sessionId),
        eq(fields.widgetId, widget.id),
        getEngagedVisitorSessionCond(fields as any),
      ),
    with: {
      widgetLeadCaptures: {
        columns: { leadId: true },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const leadId = session.widgetLeadCaptures[0]?.leadId;
  if (leadId) {
    await db
      .delete(leadTable)
      .where(and(eq(leadTable.id, leadId), eq(leadTable.workspaceId, workspace.id)));
  }
  await db.delete(conversationTable).where(eq(conversationTable.visitorSessionId, session.id));
  await db.delete(visitorSessionTable).where(eq(visitorSessionTable.id, session.id));

  if (session.contactId) {
    const hasConvos = await db.query.conversation.findFirst({
      where: (fields: any, { eq }: any) => eq(fields.contactId, session.contactId!),
      columns: { id: true },
    });
    const hasLeads = await db.query.lead.findFirst({
      where: (fields: any, { eq }: any) => eq(fields.contactId, session.contactId!),
      columns: { id: true },
    });
    const hasSessions = await db.query.visitorSession.findFirst({
      where: (fields: any, { eq }: any) => eq(fields.contactId, session.contactId!),
      columns: { id: true },
    });

    if (!hasConvos && !hasLeads && !hasSessions) {
      await db.delete(contactTable).where(eq(contactTable.id, session.contactId));
    }
  }
  return NextResponse.json({ ok: true });
}
