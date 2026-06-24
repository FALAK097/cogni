import { z } from "zod";

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
  getRequestOrigin,
  widgetHistoryToUiMessages,
  withWidgetCors,
} from "@/features/widget/server/widget-utils";
import { buildAgentMemoryContext } from "@/lib/ai/memory";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { getDb } from "@/lib/db/client";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { logError, logInfo } from "@/lib/logging/logger";
import { notifyWorkspaceMembers } from "@/lib/notifications/create-notification";
import { checkRateLimit } from "@/lib/rate-limit/memory";

export const maxDuration = 60;

const nullableText = (max: number) => z.string().trim().max(max).nullable().default(null);

function emptyToNull(value: unknown) {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return value;
}

const leadInfoSchema = z.preprocess(
  (value) => (value === undefined ? null : value),
  z
    .object({
      name: z.preprocess(emptyToNull, nullableText(100)),
      email: z.preprocess(emptyToNull, z.email().nullable().default(null)),
      phone: z.preprocess(emptyToNull, nullableText(30)),
    })
    .nullable()
    .default(null),
);

const chatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  interactionId: z.string().uuid(),
  visitorId: z.preprocess(emptyToNull, z.string().uuid().nullable().default(null)),
  message: z.string().trim().min(1).max(4_000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4_000),
      }),
    )
    .min(0)
    .max(50),
  leadInfo: leadInfoSchema,
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
  const history =
    body.history.length > 0 ? body.history : [{ role: "user" as const, content: body.message }];
  const historyMessages = widgetHistoryToUiMessages(history);
  if (!historyMessages) {
    return Response.json({ error: "A valid message history is required." }, { status: 400 });
  }

  if (body.preview) {
    try {
      const { workspace } = await requireDashboardContext();
      const widget = await getPublicWidget(db, publicKey);
      if (!widget || widget.workspaceId !== workspace.id) {
        return Response.json({ error: "Preview access denied." }, { status: 403 });
      }

      const result = await streamWidgetAgent({
        config: {
          displayName: widget.displayName,
          instructions: widget.instructions,
          escalationKeywords: widget.escalationKeywords,
          modelProvider: widget.modelProvider as WidgetModelProvider,
          modelName: widget.modelName,
          workspaceName: widget.workspace.name,
          workspaceId: widget.workspace.id,
          latestUserMessage: body.message,
          memoryContext: "",
          documentIds: null,
        },
        messages: historyMessages,
        onFinish: async () => {},
        onError: (error) => {
          logError("widget.preview.failed", {
            workspaceId: widget.workspace.id,
            widgetId: widget.id,
            error: error instanceof Error ? error.message : "Unknown model error",
          });
        },
      });

      return new Response(createWidgetSseStream(result.textStream), {
        headers: streamHeaders(),
      });
    } catch {
      return Response.json({ error: "Preview access denied." }, { status: 403 });
    }
  }

  const hostname = (
    body.metadata.hostname ??
    getRequestOrigin(request)?.replace(/^https?:\/\//, "") ??
    "unknown"
  )
    .toLowerCase()
    .replace(/\.$/, "");
  const access = await assertPublicWidgetAccess(db, publicKey, request);
  if ("error" in access) return access.error;

  const token = bearerToken(request);
  if (!token) {
    return Response.json({ error: "Widget session is required." }, { status: 401 });
  }
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

  const authorizedSession = token ? await getAuthorizedVisitorSession(db, publicKey, token) : null;
  const bootstrapClaims = authorizedSession ? null : verifyWidgetBootstrapToken(token);
  if (
    !authorizedSession &&
    (!bootstrapClaims ||
      bootstrapClaims.widgetId !== access.widget.id ||
      bootstrapClaims.publicKey !== publicKey ||
      bootstrapClaims.browserSessionId !== body.sessionId ||
      bootstrapClaims.hostname !== hostname)
  ) {
    return Response.json({ error: "Widget session is invalid or expired." }, { status: 401 });
  }
  const bootstrapSession = bootstrapClaims
    ? await getAuthorizedBootstrapRetry(db, access.widget.id, body.sessionId, body.interactionId)
    : { retryAllowed: true, session: null, conversation: null, visitorMessageId: "" };
  if (bootstrapClaims && !bootstrapSession.retryAllowed) {
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
          visitorId: bootstrapClaims?.visitorId ?? body.visitorId,
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
    const conv = await db.conversation.findUnique({
      where: { id: conversation.id },
      select: { messages: true },
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

  const activeConversation = await db.conversation.findUnique({
    where: { id: conversation.id },
    select: { aiPaused: true, status: true },
  });
  const shouldEscalate = matchesEscalationKeywords(body.message, widget.escalationKeywords);

  if (shouldEscalate && activeConversation?.status !== "ESCALATED") {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { status: "ESCALATED", aiPaused: true },
    });
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

  try {
    const memoryContext = await buildAgentMemoryContext({
      db,
      workspaceId: widget.workspace.id,
      conversationId: conversation.id,
      contactId: conversation.contactId,
    });
    const result = await streamWidgetAgent({
      config: {
        displayName: widget.displayName,
        instructions: widget.instructions,
        escalationKeywords: widget.escalationKeywords,
        modelProvider: widget.modelProvider as WidgetModelProvider,
        modelName: widget.modelName,
        workspaceName: widget.workspace.name,
        workspaceId: widget.workspace.id,
        latestUserMessage: body.message,
        memoryContext,
        documentIds: null,
      },
      messages: historyMessages,
      onFinish: async ({ text, inputTokens, outputTokens }) => {
        if (!text.trim()) return;
        await recordAiMessage({
          db,
          conversationId: conversation.id,
          text,
          replyToMessageId: visitorMessageId,
        });
        logInfo("widget.ai.response.completed", {
          workspaceId: widget.workspace.id,
          widgetId: widget.id,
          conversationId: conversation.id,
          inputTokens,
          outputTokens,
        });
      },
      onError: (error) => {
        logError("widget.ai.response.failed", {
          workspaceId: widget.workspace.id,
          widgetId: widget.id,
          conversationId: conversation.id,
          error: error instanceof Error ? error.message : "Unknown model error",
        });
      },
    });

    return withWidgetCors(
      new Response(createWidgetSseStream(result.textStream), {
        headers: streamHeaders(visitorSession),
      }),
      origin,
      corsAllowed,
    );
  } catch (error) {
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
  const session = await db.visitorSession.findFirst({
    where: { widgetId, browserSessionId, expiresAt: { gt: new Date() } },
    include: {
      widget: {
        include: {
          workspace: { select: { id: true, name: true } },
        },
      },
      conversations: {
        where: { channel: "WIDGET", status: { not: "CLOSED" } },
        orderBy: { updatedAt: "desc" },
        take: 1,
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
