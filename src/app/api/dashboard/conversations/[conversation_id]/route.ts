import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import type { MessageJson } from "@/features/conversations/server/conversation-service";
import {
  appendTeamConversationMessage,
  broadcastConversationChanged,
  getConversation,
  markConversationAsRead,
} from "@/features/conversations/server/queries";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { isChatSdkChannel, postChannelReply } from "@/features/integrations/server/chat-sdk";
import {
  conversation as conversationTable,
  visitorSession as visitorSessionTable,
} from "@/lib/db/schema";

type RouteContext = { params: Promise<{ conversation_id: string }> };

function mapMessageToClient(message: MessageJson, agentName: string) {
  const isTeam = message.authorType === "TEAM";
  const isVisitor = message.authorType === "VISITOR";

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
    isInternal: message.visibility === "INTERNAL",
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { db, workspace, membership } = await requireDashboardContext();
  const { conversation_id: conversationId } = await context.params;

  const conversation = await getConversation(workspace.id, conversationId);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const agentName = conversation.widget?.displayName ?? "Assistant";
  const session = conversation.visitorSession;

  const publicMessages = conversation.messages
    .filter((message) => message.visibility === "PUBLIC" || !message.visibility)
    .map((message) => mapMessageToClient(message, agentName));

  const internalNotes = conversation.messages
    .filter((message) => message.authorType === "TEAM" && message.visibility === "INTERNAL")
    .map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
    }));

  const previous = await db.query.conversation.findMany({
    where: (fields, { eq, and, ne }) =>
      and(
        eq(fields.contactId, conversation.contactId),
        eq(fields.workspaceId, workspace.id),
        ne(fields.id, conversation.id),
      ),
    orderBy: (fields, { desc }) => [desc(fields.lastMessageAt)],
    limit: 5,
    columns: {
      id: true,
      subject: true,
      status: true,
      lastMessageAt: true,
    },
  });
  const previousConversations = previous.map((entry) => ({
    id: entry.id,
    subject: entry.subject,
    status: entry.status,
    lastMessageAt: entry.lastMessageAt
      ? new Date(entry.lastMessageAt).toISOString()
      : new Date().toISOString(),
  }));

  const workflowRuns = await db.query.workflowRun.findMany({
    where: (fields, { and, eq }) =>
      and(eq(fields.workspaceId, workspace.id), eq(fields.conversationId, conversation.id)),
    orderBy: (fields, { desc }) => [desc(fields.startedAt)],
    limit: 10,
  });
  const workflowRunIds = workflowRuns.map((run) => run.id);
  const workflowSteps =
    workflowRunIds.length > 0
      ? await db.query.workflowStep.findMany({
          where: (fields, { and, eq }) =>
            and(
              eq(fields.workspaceId, workspace.id),
              inArray(fields.workflowRunId, workflowRunIds),
            ),
          orderBy: (fields, { asc }) => [asc(fields.position)],
        })
      : [];

  function parseObject(value: string) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  return NextResponse.json({
    id: conversation.id,
    visitorSessionId: conversation.visitorSessionId,
    visitorId: session?.visitorId ?? conversation.contactId,
    city: session?.city ?? null,
    country: session?.country ?? null,
    os: session?.os ?? null,
    browser: session?.browser ?? null,
    screenSize: session?.screenSize ?? null,
    pageUrl: session?.pageUrl ?? null,
    referrer: session?.referrer ?? null,
    timezone: session?.timezone ?? null,
    createdAt: new Date(conversation.createdAt).toISOString(),
    lastActivityAt: conversation.lastMessageAt
      ? new Date(conversation.lastMessageAt).toISOString()
      : new Date().toISOString(),
    ipData: session?.ipData ? JSON.parse(session.ipData) : null,
    messages: publicMessages,
    contactName: conversation.contact.name,
    contactEmail: conversation.contact.email,
    contactId: conversation.contact.id,
    contactExternalId: conversation.contact.externalId,
    contactCreatedAt: new Date(conversation.contact.createdAt).toISOString(),
    contactLastSeenAt: conversation.contact.lastSeenAt
      ? new Date(conversation.contact.lastSeenAt).toISOString()
      : null,
    contactPhone: conversation.contact.phone,
    contactSource: conversation.contact.source,
    contactCapturedAt: conversation.contact.capturedAt
      ? new Date(conversation.contact.capturedAt).toISOString()
      : null,
    contactCaptureContext: JSON.parse(conversation.contact.captureContext) as unknown,
    conversationId: conversation.id,
    conversationStatus: conversation.status,
    aiPaused: conversation.aiPaused,
    conversationChannel: conversation.channel,
    conversationStartedAt: new Date(conversation.createdAt).toISOString(),
    conversationSubject: conversation.subject,
    assigneeName: conversation.assignedMember?.user.name ?? null,
    assigneeId: conversation.assignedMemberId,
    agentName,
    currentMembershipId: membership.id,
    previousConversations,
    contactNotes:
      conversation.contact.notes?.map((note) => ({
        id: note.id,
        body: note.body,
        createdAt: new Date(note.createdAt).toISOString(),
        authorName: note.authorUser.name,
      })) ?? [],
    internalNotes,
    workflows: workflowRuns.map((run) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      input: parseObject(run.input),
      errorMessage: run.errorMessage,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      steps: workflowSteps
        .filter((step) => step.workflowRunId === run.id)
        .map((step) => ({
          id: step.id,
          position: step.position,
          name: step.name,
          kind: step.kind,
          status: step.status,
          errorMessage: step.errorMessage,
          startedAt: step.startedAt,
          finishedAt: step.finishedAt,
        })),
    })),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { db, workspace, membership } = await requireDashboardContext();
  const { conversation_id: conversationId } = await context.params;

  let body: { action?: string; message?: string };
  try {
    body = (await request.json()) as { action?: string; message?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const conversation = await db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, conversationId), eq(fields.workspaceId, workspace.id)),
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (body.action === "assign") {
    await db
      .update(conversationTable)
      .set({ assignedMemberId: membership.id, status: "ASSIGNED" })
      .where(
        and(
          eq(conversationTable.id, conversation.id),
          eq(conversationTable.workspaceId, workspace.id),
        ),
      );
    await broadcastConversationChanged(conversation.id, "ASSIGNED", membership.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "read") {
    await markConversationAsRead(workspace.id, conversation.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reply" || body.action === "note") {
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (body.action === "reply" && conversation.channel !== "WIDGET") {
      if (!conversation.externalThreadId) {
        return NextResponse.json({ error: "Channel reply is unavailable." }, { status: 409 });
      }
      const integration = await db.query.integration.findFirst({
        where: (fields, { and, eq }) =>
          and(
            eq(fields.workspaceId, workspace.id),
            eq(fields.provider, conversation.channel),
            eq(fields.status, "CONNECTED"),
          ),
        columns: { id: true },
      });
      if (!integration) {
        return NextResponse.json(
          { error: "Channel integration is disconnected." },
          { status: 409 },
        );
      }
      const channel = conversation.channel.toLowerCase();
      if (!isChatSdkChannel(channel)) {
        return NextResponse.json({ error: "Unsupported channel." }, { status: 409 });
      }
      await postChannelReply({
        channel,
        db,
        workspaceId: workspace.id,
        integrationId: integration.id,
        externalThreadId: conversation.externalThreadId,
        text: message,
      });
    }

    const saved = await appendTeamConversationMessage(
      workspace.id,
      conversation.id,
      {
        body: message,
        authorType: "TEAM",
        visibility: body.action === "note" ? "INTERNAL" : "PUBLIC",
      },
      { updateLastMessageAt: body.action === "reply" },
    );

    if (!saved) {
      return NextResponse.json(
        { error: "Failed to save message. Please try again." },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { conversation_id: conversationId } = await context.params;

  const conversation = await db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, conversationId), eq(fields.workspaceId, workspace.id)),
    with: { visitorSession: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (conversation.visitorSessionId) {
    await db
      .delete(conversationTable)
      .where(
        and(
          eq(conversationTable.visitorSessionId, conversation.visitorSessionId),
          eq(conversationTable.workspaceId, workspace.id),
        ),
      );
    await db
      .delete(visitorSessionTable)
      .where(eq(visitorSessionTable.id, conversation.visitorSessionId));
  } else {
    await db.delete(conversationTable).where(eq(conversationTable.id, conversation.id));
  }

  return NextResponse.json({ ok: true });
}
