import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import {
  recordAiMessage,
  recordVisitorMessage,
  startVisitorConversation,
  type MessageJson,
} from "@/features/conversations/server/conversation-service";
import { handoffReply, matchesEscalationKeywords } from "@/features/conversations/server/handoff";
import type { WidgetModelProvider } from "@/features/widget/domain";
import {
  assertPublicWidgetAccess,
  bearerToken,
  getAuthorizedVisitorSession,
} from "@/features/widget/server/widget-public";
import { verifyWidgetBootstrapToken } from "@/features/widget/server/widget-bootstrap";
import { streamWidgetAgent } from "@/features/widget/server/widget-agent";
import { getPublicWidget, validateEmbedOrigin } from "@/features/widget/server/widget-service";
import {
  createWidgetSseStream,
  interruptWidgetTextStream,
  readWidgetModelText,
  getRequestOrigin,
  widgetHistoryToUiMessages,
  widgetPreflightResponse,
  withWidgetCors,
} from "@/features/widget/server/widget-utils";
import { buildAgentMemoryContext } from "@/lib/ai/memory";
import {
  buildWidgetAgentRuntimeContext,
  completeAgentRun,
  createWidgetAgentRun,
  failAgentRun,
} from "@/lib/ai/telemetry";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { getDb } from "@/lib/db/client";
import { conversation as conversationTable } from "@/lib/db/schema";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { logError, logInfo } from "@/lib/logging/logger";
import { notifyWorkspaceMembers } from "@/lib/notifications/create-notification";
import { checkRateLimit } from "@/lib/rate-limit/memory";
import { env } from "@/lib/env/server";

export const maxDuration = 60;

export function OPTIONS(request: Request) {
  return widgetPreflightResponse(request);
}

const PREVIEW_HOSTNAME = "dashboard-preview";

const nullableText = (max: number) => z.string().trim().max(max).nullable().default(null);

const chatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  interactionId: z.string().uuid(),
  visitorId: z.string().uuid().nullable().default(null),
  message: z.string().trim().min(1).max(4_000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4_000),
      }),
    )
    .min(1)
    .max(50),
  leadInfo: z
    .object({
      name: nullableText(100),
      email: z.email().nullable().default(null),
      phone: nullableText(30),
    })
    .nullable()
    .default(null),
  preview: z.boolean().default(false),
  metadata: z
    .object({
      hostname: nullableText(253),
      pageUrl: nullableText(2_000),
      referrer: nullableText(2_000),
      browser: nullableText(100),
      deviceType: nullableText(50),
      os: nullableText(100),
      country: nullableText(100),
      city: nullableText(100),
      timezone: nullableText(100),
      language: nullableText(50),
      screenSize: nullableText(50),
    })
    .default({
      hostname: null,
      pageUrl: null,
      referrer: null,
      browser: null,
      deviceType: null,
      os: null,
      country: null,
      city: null,
      timezone: null,
      language: null,
      screenSize: null,
    }),
});

function streamHeaders(session?: { id: string; token: string }) {
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  if (session) {
    headers.set("X-Widget-Session-Id", session.id);
    headers.set("X-Widget-Session-Token", session.token);
  }
  return headers;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 250_000) {
    return Response.json({ error: "Request is too large." }, { status: 413 });
  }

  const parsed = chatRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid chat request." }, { status: 400 });
  }

  const { publicKey } = await params;
  const db = getDb();
  const body = parsed.data;
  const historyMessages = widgetHistoryToUiMessages(body.history);
  if (!historyMessages) {
    return Response.json({ error: "A valid message history is required." }, { status: 400 });
  }

  const isPreview = body.preview;
  let access:
    | {
        widget: NonNullable<Awaited<ReturnType<typeof getPublicWidget>>>;
        origin: string | null;
        allowedDomains: string[];
      }
    | { error: Response };

  if (isPreview) {
    try {
      const { workspace } = await requireDashboardContext();
      const widget = await getPublicWidget(db, publicKey);
      if (!widget || widget.workspaceId !== workspace.id) {
        return Response.json({ error: "Preview access denied." }, { status: 403 });
      }

      access = {
        widget,
        origin: getRequestOrigin(request),
        allowedDomains: JSON.parse(widget.authorizedDomains || "[]") as string[],
      };
    } catch {
      return Response.json({ error: "Preview access denied." }, { status: 403 });
    }
  } else {
    const publicAccess = await assertPublicWidgetAccess(db, publicKey, request);
    if ("error" in publicAccess) return publicAccess.error;
    access = publicAccess;
  }

  const hostname = isPreview
    ? PREVIEW_HOSTNAME
    : (
        body.metadata.hostname ??
        getRequestOrigin(request)?.replace(/^https?:\/\//, "") ??
        "unknown"
      )
        .toLowerCase()
        .replace(/\.$/, "");

  const token = bearerToken(request);
  if (!token && !isPreview) {
    return Response.json({ error: "Widget session is required." }, { status: 401 });
  }

  if (!isPreview) {
    const rateLimit = checkRateLimit({
      key: `widget-chat:${token}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return Response.json(
        { error: "Too many messages. Wait a moment before trying again." },
        { status: 429 },
      );
    }
  }

  const authorizedSession = token ? await getAuthorizedVisitorSession(db, publicKey, token) : null;
  const bootstrapClaims = authorizedSession
    ? null
    : token
      ? verifyWidgetBootstrapToken(token)
      : null;

  if (
    !authorizedSession &&
    bootstrapClaims &&
    (bootstrapClaims.widgetId !== access.widget.id ||
      bootstrapClaims.publicKey !== publicKey ||
      bootstrapClaims.browserSessionId !== body.sessionId ||
      bootstrapClaims.hostname !== hostname)
  ) {
    return Response.json({ error: "Widget session is invalid or expired." }, { status: 401 });
  }

  if (!authorizedSession && !bootstrapClaims && !isPreview) {
    return Response.json({ error: "Widget session is required." }, { status: 401 });
  }

  const bootstrapSession =
    bootstrapClaims && !isPreview
      ? await getAuthorizedBootstrapRetry(db, access.widget.id, body.sessionId, body.interactionId)
      : { retryAllowed: true, session: null, conversation: null, visitorMessageId: "" };

  if (!isPreview && bootstrapClaims && !bootstrapSession.retryAllowed) {
    return Response.json({ error: "Widget session is already active." }, { status: 401 });
  }

  const started = authorizedSession
    ? {
        visitorSession: authorizedSession,
        ...(await recordVisitorMessage({
          db,
          visitorSession: authorizedSession,
          text: body.message,
          clientMessageId: body.interactionId,
        })),
      }
    : bootstrapSession.session && bootstrapSession.conversation
      ? {
          visitorSession: bootstrapSession.session,
          conversation: bootstrapSession.conversation,
          visitorMessageId: bootstrapSession.visitorMessageId,
          replayed: true,
        }
      : await startVisitorConversation({
          db,
          widget: access.widget,
          hostname,
          browserSessionId: body.sessionId,
          visitorId: bootstrapClaims?.visitorId ?? body.visitorId ?? randomUUID(),
          metadata: {
            ...body.metadata,
            country: body.metadata.country ?? request.headers.get("x-vercel-ip-country"),
            city: body.metadata.city ?? request.headers.get("x-vercel-ip-city"),
            timezone: body.metadata.timezone ?? request.headers.get("x-vercel-ip-timezone"),
          },
          identity: {
            name: body.leadInfo?.name ?? null,
            email: body.leadInfo?.email ?? null,
          },
          text: body.message,
          clientMessageId: body.interactionId,
        });

  const { visitorSession, conversation, visitorMessageId, replayed } = started;
  const widget = visitorSession.widget;
  if (replayed) {
    const conv = await db.query.conversation.findFirst({
      where: (fields, { eq, and }) =>
        and(eq(fields.id, conversation.id), eq(fields.workspaceId, widget.workspace.id)),
      columns: { messages: true },
    });
    const list = JSON.parse(conv?.messages || "[]") as MessageJson[];
    const existingReply = list.find((m) => m.replyToMessageId === visitorMessageId);
    if (existingReply) {
      const origin = getRequestOrigin(request);
      return withWidgetCors(
        new Response(
          createWidgetSseStream(
            (async function* () {
              yield existingReply.body;
            })(),
          ),
          { headers: streamHeaders(visitorSession) },
        ),
        origin,
        validateEmbedOrigin(origin, access.allowedDomains),
      );
    }
  }

  const activeConversation = await db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, conversation.id), eq(fields.workspaceId, widget.workspace.id)),
    columns: { aiPaused: true, status: true },
  });
  const shouldEscalate = matchesEscalationKeywords(body.message, widget.escalationKeywords);

  if (shouldEscalate && activeConversation?.status !== "ESCALATED") {
    await db
      .update(conversationTable)
      .set({
        status: "ESCALATED",
        aiPaused: true,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(conversationTable.id, conversation.id),
          eq(conversationTable.workspaceId, widget.workspace.id),
        ),
      );
    await notifyWorkspaceMembers({
      db,
      workspaceId: widget.workspace.id,
      type: "conversation.escalated",
      title: "Conversation escalated",
      body: body.message.slice(0, 120),
    });
    await emitDomainEvent({
      db,
      workspaceId: widget.workspace.id,
      type: "escalation.triggered",
      entityId: conversation.id,
    });
  }

  const origin = getRequestOrigin(request);
  const corsAllowed = validateEmbedOrigin(origin, access.allowedDomains);
  const respondWithText = (text: string) => {
    const stream = createWidgetSseStream(
      (async function* () {
        yield text;
      })(),
      {
        onComplete: async () => {
          await recordAiMessage({
            db,
            conversationId: conversation.id,
            text,
            replyToMessageId: visitorMessageId,
          });
        },
      },
    );
    return withWidgetCors(
      new Response(stream, {
        headers: streamHeaders(visitorSession),
      }),
      origin,
      corsAllowed,
    );
  };

  if (activeConversation?.aiPaused || shouldEscalate) {
    return respondWithText(handoffReply);
  }

  let run: { id: string; startedAtMs: number } | null = null;

  try {
    const memoryContext = await buildAgentMemoryContext({
      db,
      workspaceId: widget.workspace.id,
      conversationId: conversation.id,
      contactId: conversation.contactId,
    });
    const latestConversationState = await db.query.conversation.findFirst({
      where: (fields, { eq, and }) =>
        and(eq(fields.id, conversation.id), eq(fields.workspaceId, widget.workspace.id)),
      columns: { aiPaused: true, status: true },
    });
    if (
      !latestConversationState ||
      latestConversationState.aiPaused ||
      latestConversationState.status === "ESCALATED"
    ) {
      return respondWithText(handoffReply);
    }

    const runtimeContext = buildWidgetAgentRuntimeContext({
      workspaceId: widget.workspace.id,
      widgetId: widget.id,
      conversationId: conversation.id,
      contactId: conversation.contactId,
      visitorSessionId: isPreview ? null : visitorSession.id,
      locale: body.metadata.language,
    });

    const resolvedModelProvider =
      env.WIDGET_MODEL_PROVIDER ?? (widget.modelProvider as WidgetModelProvider);
    const resolvedModelName = env.WIDGET_MODEL_NAME ?? widget.modelName;

    run = isPreview
      ? null
      : await createWidgetAgentRun({
          db,
          runtimeContext,
          modelProvider: resolvedModelProvider,
          modelName: resolvedModelName,
        });
    const result = await streamWidgetAgent({
      config: {
        displayName: widget.displayName,
        instructions: widget.instructions,
        escalationKeywords: widget.escalationKeywords,
        modelProvider: resolvedModelProvider,
        modelName: resolvedModelName,
        workspaceName: widget.workspace.name,
        workspaceId: widget.workspace.id,
        latestUserMessage: body.message,
        memoryContext,
        documentIds: null,
        runTimeoutMs: runtimeContext.runTimeoutMs,
        db,
        conversationId: conversation.id,
        agentRunId: run?.id ?? null,
      },
      messages: historyMessages,
      onFinish: async ({ text, inputTokens, outputTokens, totalTokens, finishReason, sources }) => {
        if (!text.trim()) {
          if (run) {
            await completeAgentRun({
              db,
              agentRunId: run.id,
              startedAtMs: run.startedAtMs,
              usage: { inputTokens, outputTokens, totalTokens },
              finishReason,
              sources,
            });
          }
          return;
        }
        await recordAiMessage({
          db,
          conversationId: conversation.id,
          text,
          replyToMessageId: visitorMessageId,
        });
        if (run) {
          await completeAgentRun({
            db,
            agentRunId: run.id,
            startedAtMs: run.startedAtMs,
            usage: { inputTokens, outputTokens, totalTokens },
            finishReason,
            sources,
          });
        }
        logInfo("widget.ai.response.completed", {
          workspaceId: widget.workspace.id,
          widgetId: widget.id,
          conversationId: conversation.id,
          agentRunId: run?.id ?? null,
          inputTokens,
          outputTokens,
          totalTokens,
          finishReason,
        });
      },
      onError: (error) => {
        if (run) {
          void failAgentRun({
            db,
            agentRunId: run.id,
            startedAtMs: run.startedAtMs,
            error,
          });
        }
        logError("widget.ai.response.failed", {
          workspaceId: widget.workspace.id,
          widgetId: widget.id,
          conversationId: conversation.id,
          agentRunId: run?.id ?? null,
          error: error instanceof Error ? error.message : "Unknown model error",
        });
      },
    });

    let monitoring = true;
    let checkInProgress = false;
    const stopMonitoring = () => {
      monitoring = false;
      clearInterval(pauseMonitor);
    };
    const checkForHumanTakeover = async () => {
      if (!monitoring || checkInProgress) return;
      checkInProgress = true;
      try {
        const latest = await db.query.conversation.findFirst({
          where: (fields, { eq, and }) =>
            and(eq(fields.id, conversation.id), eq(fields.workspaceId, widget.workspace.id)),
          columns: { aiPaused: true, status: true },
        });
        if (monitoring && (!latest || latest.aiPaused || latest.status === "ESCALATED")) {
          result.interruptForTakeover();
        }
      } catch {
        if (monitoring) result.interruptForTakeover();
      } finally {
        checkInProgress = false;
      }
    };
    const pauseMonitor = setInterval(() => void checkForHumanTakeover(), 1_000);
    void checkForHumanTakeover();

    return withWidgetCors(
      new Response(
        createWidgetSseStream(
          interruptWidgetTextStream(readWidgetModelText(result.fullStream), result.abortSignal),
          {
            onComplete: result.waitForCompletion,
            onFinally: stopMonitoring,
            onCancel: result.interruptForTakeover,
          },
        ),
        {
          headers: streamHeaders(visitorSession),
        },
      ),
      origin,
      corsAllowed,
    );
  } catch (error) {
    if (run) {
      void failAgentRun({
        db,
        agentRunId: run.id,
        startedAtMs: run.startedAtMs,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
    logError("widget.chat.failed", {
      workspaceId: widget.workspace.id,
      widgetId: widget.id,
      conversationId: conversation.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json({ error: "The assistant is unavailable right now." }, { status: 503 });
  }
}

async function getAuthorizedBootstrapRetry(
  db: ReturnType<typeof getDb>,
  widgetId: string,
  browserSessionId: string,
  interactionId: string,
) {
  const nowIso = new Date().toISOString();
  const session = await db.query.visitorSession.findFirst({
    where: (fields, { eq, and, gt }) =>
      and(
        eq(fields.widgetId, widgetId),
        eq(fields.browserSessionId, browserSessionId),
        gt(fields.expiresAt, nowIso),
      ),
    with: {
      widget: {
        with: {
          workspace: {
            columns: { id: true, name: true },
          },
        },
      },
      conversations: {
        where: (fields, { eq, and, ne }) =>
          and(eq(fields.channel, "WIDGET"), ne(fields.status, "CLOSED")),
        orderBy: (fields, { desc }) => [desc(fields.updatedAt)],
        limit: 1,
      },
    },
  });
  if (!session) {
    return {
      retryAllowed: true,
      session: null,
      conversation: null,
      visitorMessageId: "",
    };
  }

  const conversation = session.conversations[0];
  if (!conversation) {
    return {
      retryAllowed: true,
      session,
      conversation: null,
      visitorMessageId: "",
    };
  }

  const list = JSON.parse(conversation.messages || "[]") as MessageJson[];
  const visitorMessage = list.find((m) => m.clientId === interactionId);
  if (!visitorMessage) {
    return {
      retryAllowed: true,
      session,
      conversation: null,
      visitorMessageId: "",
    };
  }

  return {
    retryAllowed: true,
    session,
    conversation,
    visitorMessageId: visitorMessage.id,
  };
}
