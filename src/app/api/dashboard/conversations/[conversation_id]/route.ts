import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, inArray, ne } from "drizzle-orm";

import type { MessageJson } from "@/features/conversations/server/conversation-service";
import {
  appendTeamConversationMessage,
  broadcastConversationChanged,
  getConversation,
  markConversationAsRead,
} from "@/features/conversations/server/queries";
import { setConversationStatus } from "@/features/conversations/server/conversation-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { parseContactTags } from "@/features/contacts/server/contact-tags";
import { parseConversationLabels } from "@/features/conversations/server/labels";
import { uploadPublicPath } from "@/lib/storage/index";
import { isChatSdkChannel, postChannelReply } from "@/features/integrations/server/chat-sdk";
import { conversation as conversationTable } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ conversation_id: string }> };

const uncertainChannelReplyMessage =
  "The channel may have received this reply, but Cogni could not confirm or save it. Check the channel before sending again.";

function uncertainChannelReplyResponse() {
  return NextResponse.json({ error: uncertainChannelReplyMessage }, { status: 502 });
}

function mapMessageToClient(message: MessageJson, agentName: string) {
  const isTeam = message.authorType === "TEAM";
  const isVisitor = message.authorType === "VISITOR";

  return {
    id: message.id,
    role: isVisitor ? ("user" as const) : ("assistant" as const),
    authorType: message.authorType,
    authorName: isVisitor ? null : isTeam ? (message.authorName ?? "Team") : agentName,
    content: message.body,
    timestamp: message.createdAt,
    visibility: message.visibility ?? "PUBLIC",
    feedback: message.feedback ?? null,
    feedbackReason: message.feedbackReason ?? null,
    feedbackAt: message.feedbackAt ?? null,
    citations: message.citations ?? [],
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
  const attachments = await db.query.attachment.findMany({
    where: (fields, { eq, and }) =>
      and(eq(fields.conversationId, conversation.id), eq(fields.workspaceId, workspace.id)),
    orderBy: (fields, { asc }) => [asc(fields.createdAt)],
    columns: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      storageKey: true,
      createdAt: true,
    },
  });

  const publicMessages = conversation.messages
    .filter((message) => message.visibility === "PUBLIC" || !message.visibility)
    .map((message) => mapMessageToClient(message, agentName));

  const internalNotes = conversation.messages
    .filter((message) => message.authorType === "TEAM" && message.visibility === "INTERNAL")
    .map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      authorName: message.authorName?.trim() || "Team",
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
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      createdAt: new Date(attachment.createdAt).toISOString(),
      url: uploadPublicPath(attachment.storageKey),
    })),
    contactName: conversation.contact.name,
    contactEmail: conversation.contact.email,
    contactId: conversation.contact.id,
    contactExternalId: conversation.contact.externalId,
    contactCreatedAt: new Date(conversation.contact.createdAt).toISOString(),
    contactLastSeenAt: conversation.contact.lastSeenAt
      ? new Date(conversation.contact.lastSeenAt).toISOString()
      : null,
    contactPhone: conversation.contact.phone,
    contactTags: parseContactTags(conversation.contact.tags),
    conversationLabels: parseConversationLabels(conversation.labels),
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
    snoozedUntil: conversation.snoozedUntil,
    workspaceTimezone: workspace.timezone,
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
  const { db, workspace, membership, session } = await requireDashboardContext();
  const { conversation_id: conversationId } = await context.params;

  let body: {
    action?: string;
    message?: string;
    paused?: boolean;
    readThroughMessageId?: string;
    snoozedUntil?: string;
    assignedMemberId?: string | null;
  };
  try {
    body = (await request.json()) as {
      action?: string;
      message?: string;
      paused?: boolean;
      readThroughMessageId?: string;
      snoozedUntil?: string;
      assignedMemberId?: string | null;
    };
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

  if (body.action === "assign_to_member") {
    const assignment = z
      .object({
        action: z.literal("assign_to_member"),
        assignedMemberId: z.union([z.string().trim().min(1).max(128), z.null()]),
      })
      .strict()
      .safeParse(body);
    if (!assignment.success) {
      return NextResponse.json({ error: "Choose a valid workspace teammate." }, { status: 400 });
    }

    const assignedMemberId = assignment.data.assignedMemberId;
    if (assignedMemberId) {
      const assignedMember = await db.query.workspaceMember.findFirst({
        where: (fields, { eq, and }) =>
          and(eq(fields.id, assignedMemberId), eq(fields.workspaceId, workspace.id)),
        columns: { id: true },
      });
      if (!assignedMember) {
        return NextResponse.json(
          { error: "That teammate is not in this workspace." },
          { status: 404 },
        );
      }
    }

    const status =
      conversation.status === "CLOSED" ? "CLOSED" : assignedMemberId ? "ASSIGNED" : "OPEN";
    const updated = await db
      .update(conversationTable)
      .set({
        assignedMemberId,
        status,
        snoozedUntil: null,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(conversationTable.id, conversation.id),
          eq(conversationTable.workspaceId, workspace.id),
        ),
      )
      .returning({ id: conversationTable.id });
    if (updated.length === 0) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    await broadcastConversationChanged(conversation.id, status, assignedMemberId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "assign" || body.action === "takeover") {
    const takeOver = body.action === "takeover";
    await db
      .update(conversationTable)
      .set({
        assignedMemberId: membership.id,
        status: "ASSIGNED",
        snoozedUntil: null,
        ...(takeOver ? { aiPaused: true } : {}),
      })
      .where(
        and(
          eq(conversationTable.id, conversation.id),
          eq(conversationTable.workspaceId, workspace.id),
        ),
      );
    await broadcastConversationChanged(conversation.id, "ASSIGNED", membership.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "snooze" || body.action === "unsnooze") {
    if (body.action === "snooze" && conversation.status === "CLOSED") {
      return NextResponse.json(
        { error: "Resolved conversations cannot be snoozed." },
        { status: 409 },
      );
    }

    let snoozedUntil: string | null = null;
    if (body.action === "snooze") {
      const parsedUntil = z.string().datetime({ offset: true }).safeParse(body.snoozedUntil);
      const timestamp = parsedUntil.success ? Date.parse(parsedUntil.data) : Number.NaN;
      const maxSnoozeAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      if (!Number.isFinite(timestamp) || timestamp <= Date.now() || timestamp > maxSnoozeAt) {
        return NextResponse.json(
          { error: "Choose a valid snooze time within the next 30 days." },
          { status: 400 },
        );
      }
      snoozedUntil = new Date(timestamp).toISOString();
    }

    const updated = await db
      .update(conversationTable)
      .set({ snoozedUntil, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(conversationTable.id, conversation.id),
          eq(conversationTable.workspaceId, workspace.id),
          ne(conversationTable.status, "CLOSED"),
        ),
      )
      .returning({ id: conversationTable.id });
    if (updated.length === 0) {
      return NextResponse.json({ error: "Conversation is resolved." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, snoozedUntil });
  }

  if (body.action === "set_ai_paused") {
    if (typeof body.paused !== "boolean") {
      return NextResponse.json({ error: "A valid AI reply state is required." }, { status: 400 });
    }
    await db
      .update(conversationTable)
      .set({ aiPaused: body.paused })
      .where(
        and(
          eq(conversationTable.id, conversation.id),
          eq(conversationTable.workspaceId, workspace.id),
        ),
      );
    await broadcastConversationChanged(
      conversation.id,
      conversation.status,
      conversation.assignedMemberId,
    );
    return NextResponse.json({ ok: true });
  }

  if (body.action === "close" || body.action === "reopen") {
    const updated = await setConversationStatus({
      db,
      workspaceId: workspace.id,
      conversationId: conversation.id,
      status: body.action === "close" ? "CLOSED" : "OPEN",
    });
    if (!updated) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    await broadcastConversationChanged(updated.id, updated.status, updated.assignedMemberId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "read") {
    if (!body.readThroughMessageId || body.readThroughMessageId.length > 128) {
      return NextResponse.json({ error: "A valid read boundary is required." }, { status: 400 });
    }
    await markConversationAsRead(workspace.id, conversation.id, body.readThroughMessageId);
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
      try {
        await postChannelReply({
          channel,
          db,
          workspaceId: workspace.id,
          integrationId: integration.id,
          externalThreadId: conversation.externalThreadId,
          text: message,
        });
      } catch {
        return uncertainChannelReplyResponse();
      }
    }

    let saved: boolean;
    try {
      saved = await appendTeamConversationMessage(
        workspace.id,
        conversation.id,
        {
          body: message,
          authorType: "TEAM",
          authorName: session.user.name,
          visibility: body.action === "note" ? "INTERNAL" : "PUBLIC",
        },
        { updateLastMessageAt: body.action === "reply" },
      );
    } catch (error) {
      if (body.action === "reply" && conversation.channel !== "WIDGET") {
        return uncertainChannelReplyResponse();
      }
      throw error;
    }

    if (!saved) {
      if (body.action === "reply" && conversation.channel !== "WIDGET") {
        return uncertainChannelReplyResponse();
      }
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
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can delete conversations." },
      { status: 403 },
    );
  }
  const { conversation_id: conversationId } = await context.params;

  const deleted = await db
    .delete(conversationTable)
    .where(
      and(
        eq(conversationTable.id, conversationId),
        eq(conversationTable.workspaceId, workspace.id),
      ),
    )
    .returning({ id: conversationTable.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
