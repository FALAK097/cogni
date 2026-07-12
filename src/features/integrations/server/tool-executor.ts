import "server-only";

import { Composio } from "@composio/core";
import { and, eq } from "drizzle-orm";
import { Resend } from "resend";

import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { parseToolInput } from "@/features/integrations/server/tool-registry";
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
    const messages = JSON.parse(currentConversation.messages) as MessageJson[];
    const note: MessageJson = {
      id: crypto.randomUUID(),
      body: message,
      authorType: "TEAM",
      visibility: "INTERNAL",
      createdAt: new Date().toISOString(),
    };
    await db
      .update(conversation)
      .set({ messages: JSON.stringify([...messages, note]), updatedAt: note.createdAt })
      .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)));
    return { conversationId, noteId: note.id };
  }

  if (actionType === "contact.update") {
    const name = typeof input.name === "string" ? input.name : currentConversation.contact.name;
    const email = typeof input.email === "string" ? input.email : currentConversation.contact.email;
    await db
      .update(contact)
      .set({ name, email, updatedAt: new Date().toISOString() })
      .where(
        and(eq(contact.id, currentConversation.contactId), eq(contact.workspaceId, workspaceId)),
      );
    return { contactId: currentConversation.contactId, name, email };
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
  actionType: string;
  input: Record<string, unknown>;
}) {
  if (!env.COMPOSIO_API_KEY) throw new Error("Composio is not configured.");
  const connection = await db.query.integration.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.workspaceId, workspaceId), eq(fields.provider, provider)),
  });
  if (!connection?.connectedAccountId || connection.status !== "CONNECTED") {
    throw new Error(`${provider} is not connected.`);
  }
  const toolSlug =
    actionType === "calendar.create" ? "GOOGLECALENDAR_CREATE_EVENT" : "SLACK_SEND_MESSAGE";
  const composio = new Composio({ apiKey: env.COMPOSIO_API_KEY });
  return composio.tools.execute(
    toolSlug,
    {
      userId: workspaceId,
      connectedAccountId: connection.connectedAccountId,
      version: connection.toolkitVersion ?? "latest",
      dangerouslySkipVersionCheck: connection.toolkitVersion === null,
      arguments: input,
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
  if (existing) return existing;

  const [action] = await db
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
      updatedAt: new Date().toISOString(),
    })
    .returning();

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
              actionType,
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
