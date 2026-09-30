import "server-only";

import { Composio } from "@composio/core";
import { and, eq } from "drizzle-orm";
import { Resend } from "resend";

import {
  appendConversationMessage,
  type MessageJson,
} from "@/features/conversations/server/conversation-service";
import {
  getIntegrationTool,
  parseToolInput,
  toComposioArguments,
  type ToolActionType,
} from "@/features/integrations/server/tool-registry";
import type { Db } from "@/lib/db/client";
import { contact, conversation, integrationAction } from "@/lib/db/schema";
import { env } from "@/lib/env/server";

function requiredString(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0) throw new Error(`Missing ${key}.`);
  return value;
}

async function requireConversation(db: Db, workspaceId: string, conversationId: string) {
  const result = await db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, conversationId), eq(fields.workspaceId, workspaceId)),
    with: { contact: true },
  });
  if (!result) throw new Error("Conversation not found.");
  return result;
}

async function executeInternalTool({
  db,
  workspaceId,
  actionType,
  input,
}: {
  db: Db;
  workspaceId: string;
  actionType: string;
  input: Record<string, unknown>;
}) {
  const conversationId = requiredString(input, "conversationId");
  const currentConversation = await requireConversation(db, workspaceId, conversationId);

  if (actionType === "conversation.assign") {
    const membershipId = requiredString(input, "membershipId");
    const membership = await db.query.workspaceMember.findFirst({
      where: (fields, { eq, and }) =>
        and(eq(fields.id, membershipId), eq(fields.workspaceId, workspaceId)),
      columns: { id: true },
    });
    if (!membership) throw new Error("Teammate is not in this workspace.");
    await db
      .update(conversation)
      .set({
        assignedMemberId: membershipId,
        status: "ASSIGNED",
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)));
    return { conversationId, assignedMemberId: membershipId };
  }

  if (actionType === "conversation.note") {
    const message = requiredString(input, "message");
    const note: MessageJson = {
      id: crypto.randomUUID(),
      body: message,
      authorType: "TEAM",
      visibility: "INTERNAL",
      createdAt: new Date().toISOString(),
    };
    await appendConversationMessage({
      db,
      workspaceId,
      conversationId,
      message: note,
      updateLastMessageAt: false,
    });
    return { conversationId, noteId: note.id };
  }

  if (actionType === "contact.update") {
    const name = typeof input.name === "string" ? input.name : currentConversation.contact.name;
    const email = typeof input.email === "string" ? input.email : currentConversation.contact.email;
    const phone = typeof input.phone === "string" ? input.phone : currentConversation.contact.phone;
    await db
      .update(contact)
      .set({ name, email, phone, updatedAt: new Date().toISOString() })
      .where(
        and(eq(contact.id, currentConversation.contactId), eq(contact.workspaceId, workspaceId)),
      );
    return { contactId: currentConversation.contactId, name, email, phone };
  }

  if (actionType === "contact.add_tag") {
    const tag = requiredString(input, "tag").toLowerCase();
    const currentTags = JSON.parse(currentConversation.contact.tags) as unknown;
    const tags = Array.isArray(currentTags)
      ? currentTags.filter((value): value is string => typeof value === "string")
      : [];
    const nextTags = [...new Set([...tags, tag])].slice(0, 50);
    await db
      .update(contact)
      .set({ tags: JSON.stringify(nextTags), updatedAt: new Date().toISOString() })
      .where(
        and(eq(contact.id, currentConversation.contactId), eq(contact.workspaceId, workspaceId)),
      );
    return { contactId: currentConversation.contactId, tags: nextTags };
  }

  if (actionType === "conversation.set_status") {
    const status = requiredString(input, "status");
    await db
      .update(conversation)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)));
    return { conversationId, status };
  }

  if (actionType === "conversation.set_ai_paused") {
    const paused = input.paused;
    if (typeof paused !== "boolean") throw new Error("Missing paused state.");
    await db
      .update(conversation)
      .set({ aiPaused: paused, updatedAt: new Date().toISOString() })
      .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)));
    return { conversationId, paused };
  }

  throw new Error("Unsupported internal tool.");
}

async function executeResendTool({
  db,
  workspaceId,
  input,
  idempotencyKey,
}: {
  db: Db;
  workspaceId: string;
  input: Record<string, unknown>;
  idempotencyKey: string;
}) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) throw new Error("Resend is not configured.");
  const conversationId = requiredString(input, "conversationId");
  await requireConversation(db, workspaceId, conversationId);
  const resend = new Resend(env.RESEND_API_KEY);
  const response = await resend.emails.send(
    {
      from: env.RESEND_FROM_EMAIL,
      to: requiredString(input, "to"),
      subject: requiredString(input, "subject"),
      text: requiredString(input, "text"),
      replyTo: env.RESEND_REPLY_TO,
    },
    { idempotencyKey },
  );
  if (response.error || !response.data) throw new Error(response.error?.message ?? "Email failed.");
  return { providerMessageId: response.data.id };
}

async function executeComposioTool({
  db,
  workspaceId,
  provider,
  actionType,
  input,
}: {
  db: Db;
  workspaceId: string;
  provider: string;
  actionType: ToolActionType;
  input: Record<string, unknown>;
}) {
  if (!env.COMPOSIO_API_KEY) throw new Error("Composio is not configured.");
  const tool = getIntegrationTool(actionType);
  if (!tool?.composioToolSlug || tool.provider !== provider) {
    throw new Error(`Unsupported ${provider} action.`);
  }
  const connection = await db.query.integration.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.workspaceId, workspaceId), eq(fields.provider, provider)),
  });
  if (!connection?.connectedAccountId || connection.status !== "CONNECTED") {
    throw new Error(`${provider} is not connected.`);
  }
  const composio = new Composio({ apiKey: env.COMPOSIO_API_KEY });
  return composio.tools.execute(
    tool.composioToolSlug,
    {
      userId: workspaceId,
      connectedAccountId: connection.connectedAccountId,
      version: connection.toolkitVersion ?? "latest",
      dangerouslySkipVersionCheck: connection.toolkitVersion === null,
      arguments: toComposioArguments(actionType, input),
    },
    { signal: AbortSignal.timeout(20_000) },
  );
}

export async function executeApprovedTool({
  db,
  workspaceId,
  actionType,
  input,
  idempotencyKey,
  requestedById,
}: {
  db: Db;
  workspaceId: string;
  actionType: string;
  input: unknown;
  idempotencyKey: string;
  requestedById: string;
}) {
  const parsed = parseToolInput(actionType, input);
  const existing = await db.query.integrationAction.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.workspaceId, workspaceId), eq(fields.idempotencyKey, idempotencyKey)),
  });
  if (existing?.status === "COMPLETED") return existing;
  if (existing?.status === "RUNNING") throw new Error("This action is already running.");

  const now = new Date().toISOString();
  const [action] = existing
    ? await db
        .update(integrationAction)
        .set({ status: "RUNNING", errorMessage: null, updatedAt: now })
        .where(
          and(
            eq(integrationAction.id, existing.id),
            eq(integrationAction.workspaceId, workspaceId),
            eq(integrationAction.status, "FAILED"),
          ),
        )
        .returning()
    : await db
        .insert(integrationAction)
        .values({
          id: crypto.randomUUID(),
          workspaceId,
          provider: parsed.tool.provider,
          actionType: parsed.tool.actionType,
          idempotencyKey,
          requestedById,
          payload: JSON.stringify(parsed.input),
          status: "RUNNING",
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning();
  if (!action) throw new Error("This action is already running.");

  try {
    const result =
      parsed.tool.provider === "INTERNAL"
        ? await executeInternalTool({ db, workspaceId, actionType, input: parsed.input })
        : parsed.tool.provider === "RESEND"
          ? await executeResendTool({ db, workspaceId, input: parsed.input, idempotencyKey })
          : await executeComposioTool({
              db,
              workspaceId,
              provider: parsed.tool.provider,
              actionType: parsed.tool.actionType,
              input: parsed.input,
            });
    const [completed] = await db
      .update(integrationAction)
      .set({
        status: "COMPLETED",
        result: JSON.stringify(result),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(eq(integrationAction.id, action.id), eq(integrationAction.workspaceId, workspaceId)),
      )
      .returning();
    return completed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool execution failed.";
    await db
      .update(integrationAction)
      .set({ status: "FAILED", errorMessage: message, updatedAt: new Date().toISOString() })
      .where(
        and(eq(integrationAction.id, action.id), eq(integrationAction.workspaceId, workspaceId)),
      );
    throw error;
  }
}
