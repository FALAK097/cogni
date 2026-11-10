import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { retrieveKnowledgeContext } from "@/features/knowledge/server/retrieval";
import type { WidgetModelProvider } from "@/features/widget/domain";
import { getWidgetModel } from "@/lib/ai/providers";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { agentRun } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ conversation_id: string }> };

const copilotOutputSchema = z.object({
  summary: z.string().trim().min(1).max(1_500),
  draftReply: z.string().trim().min(1).max(4_000),
  nextActions: z.array(z.string().trim().min(1).max(300)).max(3),
});

function parseMessages(value: string) {
  const parsed = JSON.parse(value) as unknown;
  return z
    .array(
      z.object({
        body: z.string(),
        authorType: z.enum(["VISITOR", "AI", "TEAM"]),
        visibility: z.enum(["PUBLIC", "INTERNAL"]).optional(),
      }),
    )
    .parse(parsed) as Pick<MessageJson, "body" | "authorType" | "visibility">[];
}

export async function POST(_request: Request, context: RouteContext) {
  const { db, session, workspace } = await requireDashboardContext();
  const { conversation_id: conversationId } = await context.params;
  const conversation = await db.query.conversation.findFirst({
    where: (fields, { and, eq }) =>
      and(eq(fields.id, conversationId), eq(fields.workspaceId, workspace.id)),
    with: { contact: true, widget: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }
  const widget =
    conversation.widget ??
    (await db.query.widget.findFirst({
      where: (fields, { eq }) => eq(fields.workspaceId, workspace.id),
    }));
  if (!widget)
    return NextResponse.json({ error: "Workspace agent is not configured." }, { status: 409 });

  let messages: Pick<MessageJson, "body" | "authorType" | "visibility">[];
  try {
    messages = parseMessages(conversation.messages);
  } catch {
    return NextResponse.json({ error: "Conversation history is invalid." }, { status: 409 });
  }
  const publicMessages = messages.filter((message) => message.visibility !== "INTERNAL").slice(-20);
  const latestVisitorMessage = [...publicMessages]
    .reverse()
    .find((message) => message.authorType === "VISITOR")?.body;
  const sources = latestVisitorMessage
    ? await retrieveKnowledgeContext(workspace.id, latestVisitorMessage, 4)
    : [];
  const transcript = publicMessages
    .map((message) => `${message.authorType}: ${message.body}`)
    .join("\n")
    .slice(-20_000);
  const sourceContext = sources
    .map((source) => `[Source: ${source.title}]\n${source.content.slice(0, 1_200)}`)
    .join("\n\n");
  const runId = crypto.randomUUID();
  const startedAt = new Date();
  const modelProvider = widget.modelProvider as WidgetModelProvider;

  await db.insert(agentRun).values({
    id: runId,
    status: "RUNNING",
    trigger: "INBOX_COPILOT",
    modelProvider,
    modelName: widget.modelName,
    channel: "DASHBOARD",
    runtimeContext: JSON.stringify({ workspaceId: workspace.id, requestedById: session.user.id }),
    startedAt: startedAt.toISOString(),
    workspaceId: workspace.id,
    widgetId: widget.id,
    conversationId: conversation.id,
    contactId: conversation.contactId,
  });

  try {
    const result = await generateText({
      model: getWidgetModel(modelProvider, widget.modelName),
      output: Output.object({ schema: copilotOutputSchema }),
      instructions: [
        "You are an internal customer-support copilot.",
        "Summarize the request, draft a concise reply, and suggest up to three concrete next actions.",
        "Use the supplied knowledge when relevant. Never claim an action has already happened.",
        "The draft is for a human teammate to edit and send; do not address internal notes.",
      ].join("\n"),
      prompt: `Customer: ${conversation.contact.name}\n\nTranscript:\n${transcript}\n\nKnowledge:\n${sourceContext || "No matching sources."}`,
      timeout: { totalMs: 45_000, stepMs: 30_000 },
    });
    const output = copilotOutputSchema.parse(result.output);
    const finishedAt = new Date();
    await db
      .update(agentRun)
      .set({
        status: "COMPLETED",
        sourceRefs: JSON.stringify(
          sources.map((source) => ({ documentId: source.documentId, title: source.title })),
        ),
        inputTokens: result.usage.inputTokens ?? null,
        outputTokens: result.usage.outputTokens ?? null,
        totalTokens: result.usage.totalTokens ?? null,
        usage: JSON.stringify(result.usage),
        latencyMs: finishedAt.getTime() - startedAt.getTime(),
        finishReason: result.finishReason,
        finishedAt: finishedAt.toISOString(),
      })
      .where(and(eq(agentRun.id, runId), eq(agentRun.workspaceId, workspace.id)));
    return NextResponse.json({
      runId,
      ...output,
      sources: sources.map((source) => ({ documentId: source.documentId, title: source.title })),
    });
  } catch (error) {
    await db
      .update(agentRun)
      .set({
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Copilot generation failed.",
        latencyMs: Date.now() - startedAt.getTime(),
        finishedAt: new Date().toISOString(),
      })
      .where(and(eq(agentRun.id, runId), eq(agentRun.workspaceId, workspace.id)));
    return NextResponse.json({ error: "Could not generate a copilot draft." }, { status: 502 });
  }
}
