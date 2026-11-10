import { eq } from "drizzle-orm";
import { z } from "zod";

import type { WidgetModelProvider } from "@/features/widget/domain";
import { WIDGET_AGENT_RUN_TIMEOUT_MS } from "@/features/widget/agent-timeouts";
import type { Db } from "@/lib/db/client";
import { agentRun } from "@/lib/db/schema";

const agentRunRuntimeContextSchema = z.object({
  workspaceId: z.string().min(1),
  widgetId: z.string().min(1),
  conversationId: z.string().min(1),
  contactId: z.string().min(1),
  visitorSessionId: z.string().min(1).nullable(),
  channel: z.literal("WIDGET"),
  plan: z.literal("free"),
  approvalPolicy: z.literal("none"),
  locale: z.string().min(1),
  runTimeoutMs: z.number().int().positive(),
  stepTimeoutMs: z.number().int().positive(),
  chunkTimeoutMs: z.number().int().positive(),
  toolTimeoutMs: z.number().int().positive(),
});

const agentUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  totalTokens: z.number().int().nonnegative().nullable(),
});

const sourceRefSchema = z.object({
  documentId: z.string().min(1),
  title: z.string().min(1),
});

export type AgentRunRuntimeContext = z.infer<typeof agentRunRuntimeContextSchema>;
export type AgentRunUsage = z.infer<typeof agentUsageSchema>;
export type AgentRunSourceRef = z.infer<typeof sourceRefSchema>;

export const WIDGET_AGENT_TIMEOUTS = {
  runTimeoutMs: WIDGET_AGENT_RUN_TIMEOUT_MS,
  stepTimeoutMs: 20_000,
  chunkTimeoutMs: 10_000,
  toolTimeoutMs: 15_000,
} as const;

export function buildWidgetAgentRuntimeContext(input: {
  workspaceId: string;
  widgetId: string;
  conversationId: string;
  contactId: string;
  visitorSessionId: string | null;
  locale: string | null;
}): AgentRunRuntimeContext {
  return agentRunRuntimeContextSchema.parse({
    workspaceId: input.workspaceId,
    widgetId: input.widgetId,
    conversationId: input.conversationId,
    contactId: input.contactId,
    visitorSessionId: input.visitorSessionId,
    channel: "WIDGET",
    plan: "free",
    approvalPolicy: "none",
    locale: input.locale ?? "en",
    ...WIDGET_AGENT_TIMEOUTS,
  });
}

export async function createWidgetAgentRun({
  db,
  runtimeContext,
  modelProvider,
  modelName,
}: {
  db: Db;
  runtimeContext: AgentRunRuntimeContext;
  modelProvider: WidgetModelProvider;
  modelName: string;
}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(agentRun).values({
    id,
    status: "RUNNING",
    trigger: "WIDGET_CHAT",
    modelProvider,
    modelName,
    channel: runtimeContext.channel,
    runtimeContext: JSON.stringify(runtimeContext),
    startedAt: now,
    workspaceId: runtimeContext.workspaceId,
    widgetId: runtimeContext.widgetId,
    conversationId: runtimeContext.conversationId,
    contactId: runtimeContext.contactId,
    visitorSessionId: runtimeContext.visitorSessionId,
  });

  return { id, startedAtMs: Date.parse(now), runtimeContext };
}

export async function completeAgentRun({
  db,
  agentRunId,
  startedAtMs,
  usage,
  finishReason,
  sources,
}: {
  db: Db;
  agentRunId: string;
  startedAtMs: number;
  usage: AgentRunUsage;
  finishReason: string | null;
  sources: AgentRunSourceRef[];
}) {
  const parsedUsage = agentUsageSchema.parse(usage);
  const parsedSources = z.array(sourceRefSchema).parse(sources);
  const finishedAt = new Date();

  await db
    .update(agentRun)
    .set({
      status: "COMPLETED",
      usage: JSON.stringify(parsedUsage),
      inputTokens: parsedUsage.inputTokens,
      outputTokens: parsedUsage.outputTokens,
      totalTokens: parsedUsage.totalTokens,
      latencyMs: Math.max(0, finishedAt.getTime() - startedAtMs),
      finishReason,
      sourceRefs: JSON.stringify(parsedSources),
      finishedAt: finishedAt.toISOString(),
    })
    .where(eq(agentRun.id, agentRunId));
}

export async function failAgentRun({
  db,
  agentRunId,
  startedAtMs,
  error,
}: {
  db: Db;
  agentRunId: string;
  startedAtMs: number;
  error: unknown;
}) {
  const finishedAt = new Date();

  await db
    .update(agentRun)
    .set({
      status: isTimeoutError(error) ? "TIMEOUT" : "FAILED",
      latencyMs: Math.max(0, finishedAt.getTime() - startedAtMs),
      errorMessage: error instanceof Error ? error.message : "Unknown model error",
      finishedAt: finishedAt.toISOString(),
    })
    .where(eq(agentRun.id, agentRunId));
}

function isTimeoutError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}
