import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import {
  appendConversationMessage,
  type MessageJson,
} from "@/features/conversations/server/conversation-service";
import {
  DASHBOARD_SESSION_MESSAGE_MAX_LENGTH,
  DASHBOARD_SESSION_PATCH_MAX_BYTES,
  dashboardSessionPatchSchema,
} from "@/features/conversations/dashboard-session-patch";
import { readBoundedJson } from "@/lib/http/read-bounded-json";
import { getDashboardEngagedVisitorSessionCond } from "@/features/widget/server/widget-data-filters";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { canManageWorkspace } from "@/lib/auth/permissions";
import {
  conversation as conversationTable,
  contact as contactTable,
  visitorSession as visitorSessionTable,
} from "@/lib/db/schema";

type RouteContext = { params: Promise<{ session_id: string }> };

function parseMessages(messagesJson: string): MessageJson[] {
  try {
    return JSON.parse(messagesJson || "[]") as MessageJson[];
  } catch {
    return [];
  }
}

function mapMessageToClient(message: MessageJson, agentName: string) {
  const isTeam = message.authorType === "TEAM";
  const isVisitor = message.authorType === "VISITOR";
  const isInternal = message.visibility === "INTERNAL";

  return {
    id: message.id,
    role: isVisitor ? ("user" as const) : ("assistant" as const),
    authorType: message.authorType,
    authorName: isVisitor ? null : isTeam ? "You" : agentName,
    content: message.body,
    timestamp: message.createdAt,
    visibility: message.visibility ?? "PUBLIC",
    feedback: message.feedback ?? null,
    feedbackReason: message.feedbackReason ?? null,
    feedbackAt: message.feedbackAt ?? null,
    isInternal,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { db, workspace, membership } = await requireDashboardContext();
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
        getDashboardEngagedVisitorSessionCond(fields),
      ),
    with: {
      contact: {
        with: {
          contactNotes: {
            orderBy: (fields, { desc }) => [desc(fields.createdAt)],
            limit: 10,
            with: {
              user: {
                columns: { id: true, name: true },
              },
            },
          },
        },
      },
      conversations: {
        where: (fields, { eq, and, like }) =>
          and(eq(fields.channel, "WIDGET"), like(fields.messages, '%"authorType":"VISITOR"%')),
        orderBy: (fields, { desc }) => [desc(fields.lastMessageAt)],
        limit: 1,
        with: {
          workspaceMember: {
            with: { user: true },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const conversation = session.conversations[0];
  const messagesList = conversation ? parseMessages(conversation.messages) : [];
  const agentName = widget.displayName || "Assistant";

  const publicMessages = messagesList
    .filter((message) => message.visibility === "PUBLIC" || !message.visibility)
    .map((message) => mapMessageToClient(message, agentName));

  const internalNotes = messagesList
    .filter((message) => message.authorType === "TEAM" && message.visibility === "INTERNAL")
    .map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
    }));

  const previousConversations = session.contactId
    ? (
        await db.query.conversation.findMany({
          where: (fields, { eq, and, ne }) =>
            and(
              eq(fields.contactId, session.contactId!),
              eq(fields.workspaceId, workspace.id),
              conversation?.id ? ne(fields.id, conversation.id) : undefined,
              eq(fields.channel, "WIDGET"),
            ),
          orderBy: (fields, { desc }) => [desc(fields.lastMessageAt)],
          limit: 5,
          columns: {
            id: true,
            subject: true,
            status: true,
            lastMessageAt: true,
          },
        })
      ).map((entry) => ({
        id: entry.id,
        subject: entry.subject,
        status: entry.status,
        lastMessageAt: new Date(entry.lastMessageAt).toISOString(),
      }))
    : [];

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
    timezone: session.timezone,
    createdAt: createdAtIso,
    lastActivityAt: lastSeenAtIso,
    ipData: session.ipData ? JSON.parse(session.ipData) : null,
    messages: publicMessages,
    contactName: session.name ?? session.contact?.name ?? null,
    contactEmail: session.email ?? session.contact?.email ?? null,
    contactId: session.contact?.id ?? null,
    contactExternalId: session.contact?.externalId ?? null,
    contactCreatedAt: session.contact?.createdAt
      ? new Date(session.contact.createdAt).toISOString()
      : null,
    contactLastSeenAt: session.contact?.lastSeenAt
      ? new Date(session.contact.lastSeenAt).toISOString()
      : null,
    conversationId: conversation?.id ?? null,
    conversationStatus: conversation?.status ?? "OPEN",
    conversationChannel: conversation?.channel ?? "WIDGET",
    conversationStartedAt: conversation?.createdAt
      ? new Date(conversation.createdAt).toISOString()
      : createdAtIso,
    assigneeName: conversation?.workspaceMember?.user.name ?? null,
    assigneeId: conversation?.assignedMemberId ?? null,
    agentName,
    currentMembershipId: membership.id,
    previousConversations,
    contactNotes:
      session.contact?.contactNotes.map((note) => ({
        id: note.id,
        body: note.body,
        createdAt: new Date(note.createdAt).toISOString(),
        authorName: note.user.name,
      })) ?? [],
    internalNotes,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { db, workspace, membership } = await requireDashboardContext();
  const { session_id: sessionId } = await context.params;

  const parsedBody = await readBoundedJson(request, DASHBOARD_SESSION_PATCH_MAX_BYTES);
  if (!parsedBody.ok) {
    return NextResponse.json(
      {
        error:
          parsedBody.reason === "too-large" ? "Request is too large." : "Invalid request body.",
      },
      { status: parsedBody.reason === "too-large" ? 413 : 400 },
    );
  }

  const parsedAction = dashboardSessionPatchSchema.safeParse(parsedBody.value);
  if (!parsedAction.success) {
    return NextResponse.json(
      {
        error: `Invalid action or message. Replies and notes must contain 1–${DASHBOARD_SESSION_MESSAGE_MAX_LENGTH} characters and include no extra fields.`,
      },
      { status: 400 },
    );
  }
  const body = parsedAction.data;

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
        getDashboardEngagedVisitorSessionCond(fields),
      ),
    with: {
      conversations: {
        where: (fields, { eq }) => eq(fields.channel, "WIDGET"),
        orderBy: (fields, { desc }) => [desc(fields.lastMessageAt)],
        limit: 1,
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const conversation = session.conversations[0];
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (body.action === "assign") {
    const nowIso = new Date().toISOString();
    await db
      .update(conversationTable)
      .set({
        assignedMemberId: membership.id,
        status: "ASSIGNED",
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(conversationTable.id, conversation.id),
          eq(conversationTable.workspaceId, workspace.id),
        ),
      );
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reply") {
    const message = body.message;
    const nowIso = new Date().toISOString();
    const newMessage: MessageJson = {
      id: randomUUID(),
      body: message,
      authorType: "TEAM",
      visibility: "PUBLIC",
      createdAt: nowIso,
    };

    const appended = await appendConversationMessage({
      db,
      workspaceId: workspace.id,
      conversationId: conversation.id,
      message: newMessage,
    });
    if (!appended) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "note") {
    const message = body.message;
    const nowIso = new Date().toISOString();
    const newMessage: MessageJson = {
      id: randomUUID(),
      body: message,
      authorType: "TEAM",
      visibility: "INTERNAL",
      createdAt: nowIso,
    };

    const appended = await appendConversationMessage({
      db,
      workspaceId: workspace.id,
      conversationId: conversation.id,
      message: newMessage,
      updateLastMessageAt: false,
    });
    if (!appended) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can delete visitor sessions." },
      { status: 403 },
    );
  }
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
        getDashboardEngagedVisitorSessionCond(fields),
      ),
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  await db
    .delete(conversationTable)
    .where(
      and(
        eq(conversationTable.visitorSessionId, session.id),
        eq(conversationTable.workspaceId, workspace.id),
      ),
    );
  await db.delete(visitorSessionTable).where(eq(visitorSessionTable.id, session.id));

  if (session.contactId) {
    const hasConvos = await db.query.conversation.findFirst({
      where: (fields, { eq }) => eq(fields.contactId, session.contactId!),
      columns: { id: true },
    });
    const hasSessions = await db.query.visitorSession.findFirst({
      where: (fields, { eq }) => eq(fields.contactId, session.contactId!),
      columns: { id: true },
    });

    if (!hasConvos && !hasSessions) {
      await db.delete(contactTable).where(eq(contactTable.id, session.contactId));
    }
  }
  return NextResponse.json({ ok: true });
}
