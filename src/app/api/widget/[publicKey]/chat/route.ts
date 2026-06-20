import {
  recordAiMessage,
  recordVisitorMessage,
} from "@/features/conversations/server/conversation-service";
import { handoffReply, matchesEscalationKeywords } from "@/features/conversations/server/handoff";
import {
  buildCampaignPromptContext,
  getCampaignById,
  getCampaignDocumentIds,
} from "@/features/campaigns/server/campaign-service";
import type { WidgetModelProvider } from "@/features/widget/domain";
import {
  assertPublicWidgetAccess,
  bearerToken,
  getAuthorizedVisitorSession,
  getVisitorSessionByDbId,
} from "@/features/widget/server/widget-public";
import {
  createEchoSseStream,
  echoHistoryToUiMessages,
  getRequestOrigin,
  withWidgetCors,
} from "@/features/widget/server/echo-utils";
import { streamWidgetAgent } from "@/features/widget/server/widget-agent";
import { validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { buildAgentMemoryContext } from "@/lib/ai/memory";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { logError, logInfo } from "@/lib/logging/logger";
import { notifyWorkspaceMembers } from "@/lib/notifications/create-notification";
import { checkRateLimit } from "@/lib/rate-limit/memory";
import { getDb } from "@/lib/db/client";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 250_000) {
    return Response.json({ error: "Request is too large." }, { status: 413 });
  }

  const { publicKey } = await params;
  const db = getDb();
  const body = (await request.json()) as {
    sessionId?: string;
    message?: string;
    history?: { role: string; content: string }[];
    leadInfo?: { name?: string; email?: string; phone?: string } | null;
  };

  const token = bearerToken(request);
  let visitorSession = token ? await getAuthorizedVisitorSession(db, publicKey, token) : null;

  if (!visitorSession && body.sessionId) {
    const access = await assertPublicWidgetAccess(db, publicKey, request);
    if ("error" in access) return access.error;
    const session = await getVisitorSessionByDbId(db, body.sessionId, access.widget.id);
    if (session) {
      visitorSession = await getAuthorizedVisitorSession(db, publicKey, session.token);
    }
  }

  if (!visitorSession) {
    return Response.json({ error: "Widget session is invalid or expired." }, { status: 401 });
  }

  const rateLimit = checkRateLimit({
    key: `widget-chat:${visitorSession.token}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many messages. Wait a moment before trying again." },
      { status: 429 },
    );
  }

  const latestText = body.message?.trim() ?? "";
  if (!latestText || latestText.length > 4_000) {
    return Response.json({ error: "Enter a message up to 4,000 characters." }, { status: 400 });
  }

  const historyMessages = echoHistoryToUiMessages(
    body.history ?? [{ role: "user", content: latestText }],
  );
  if (!historyMessages) {
    return Response.json({ error: "A valid message history is required." }, { status: 400 });
  }

  const conversation = await recordVisitorMessage({
    db,
    visitorSession,
    text: latestText,
  });

  const widget = visitorSession.widget;
  const activeConversation = await db.conversation.findUnique({
    where: { id: conversation.id },
    select: { aiPaused: true, status: true },
  });

  const shouldEscalate = matchesEscalationKeywords(latestText, widget.escalationKeywords);

  if (shouldEscalate) {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { status: "ESCALATED", aiPaused: true },
    });

    await notifyWorkspaceMembers({
      db,
      workspaceId: widget.workspace.id,
      type: "conversation.escalated",
      title: "Conversation escalated",
      body: latestText.slice(0, 120),
    });

    await emitDomainEvent({
      db,
      workspaceId: widget.workspace.id,
      type: "escalation.triggered",
      entityId: conversation.id,
    });
  }

  const origin = getRequestOrigin(request);
  const allowedDomains = widget.authorizedDomains?.map((domain) => domain.hostname) ?? [];
  const corsAllowed = validateEmbedOrigin(origin, allowedDomains);

  const respondWithText = async (text: string) => {
    const stream = createEchoSseStream(
      (async function* () {
        yield text;
      })(),
      {
        onComplete: async () => {
          await recordAiMessage({ db, conversationId: conversation.id, text });
        },
      },
    );

    return withWidgetCors(
      new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
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

    const campaign = widget.selectedCampaignId
      ? await getCampaignById(db, widget.workspace.id, widget.selectedCampaignId)
      : null;
    const campaignContext = campaign ? buildCampaignPromptContext(campaign) : undefined;
    const documentIds = widget.selectedCampaignId
      ? await getCampaignDocumentIds(db, widget.workspace.id, widget.selectedCampaignId)
      : null;

    const result = await streamWidgetAgent({
      config: {
        displayName: widget.displayName,
        instructions: widget.instructions,
        escalationKeywords: widget.escalationKeywords,
        modelProvider: widget.modelProvider as WidgetModelProvider,
        modelName: widget.modelName,
        workspaceName: widget.workspace.name,
        workspaceId: widget.workspace.id,
        latestUserMessage: latestText,
        memoryContext,
        campaignContext,
        documentIds,
      },
      messages: historyMessages,
      onFinish: async ({ text, inputTokens, outputTokens }) => {
        if (!text.trim()) return;
        await recordAiMessage({ db, conversationId: conversation.id, text });
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

    const stream = createEchoSseStream(result.textStream);
    return withWidgetCors(
      new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
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
