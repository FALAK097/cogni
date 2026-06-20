import type { UIMessage } from "ai";

import {
  recordAiMessage,
  recordVisitorMessage,
} from "@/features/conversations/server/conversation-service";
import type { WidgetModelProvider } from "@/features/widget/domain";
import { streamWidgetAgent } from "@/features/widget/server/widget-agent";
import { getDb } from "@/lib/db/client";

export const maxDuration = 60;

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

function messageText(message: UIMessage) {
  return message.parts
    .filter((part): part is Extract<(typeof message.parts)[number], { type: "text" }> => {
      return part.type === "text";
    })
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function sanitizeMessages(value: unknown): UIMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return null;
  }

  let totalCharacters = 0;
  const messages: UIMessage[] = [];

  for (const candidate of value) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("id" in candidate) ||
      typeof candidate.id !== "string" ||
      !("role" in candidate) ||
      (candidate.role !== "user" && candidate.role !== "assistant") ||
      !("parts" in candidate) ||
      !Array.isArray(candidate.parts)
    ) {
      return null;
    }

    const parts = candidate.parts.flatMap((part: unknown) => {
      if (
        typeof part !== "object" ||
        part === null ||
        !("type" in part) ||
        part.type !== "text" ||
        !("text" in part) ||
        typeof part.text !== "string"
      ) {
        return [];
      }

      totalCharacters += part.text.length;
      return [{ type: "text" as const, text: part.text }];
    });

    if (parts.length === 0 || totalCharacters > 50_000) {
      return null;
    }

    messages.push({
      id: candidate.id,
      role: candidate.role,
      parts,
    });
  }

  return messages;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 250_000) {
    return Response.json({ error: "Request is too large." }, { status: 413 });
  }

  const token = bearerToken(request);
  if (!token) {
    return Response.json({ error: "Widget session is required." }, { status: 401 });
  }

  const { publicKey } = await params;
  const db = getDb();
  const visitorSession = await db.visitorSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      widget: {
        publicKey,
        isEnabled: true,
      },
    },
    include: {
      widget: {
        include: {
          workspace: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!visitorSession) {
    return Response.json({ error: "Widget session is invalid or expired." }, { status: 401 });
  }

  const body = (await request.json()) as { messages?: unknown };
  const messages = sanitizeMessages(body.messages);
  if (!messages) {
    return Response.json({ error: "A valid message history is required." }, { status: 400 });
  }

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const latestText = latestUserMessage ? messageText(latestUserMessage) : "";

  if (!latestUserMessage || !latestText || latestText.length > 4_000) {
    return Response.json({ error: "Enter a message up to 4,000 characters." }, { status: 400 });
  }

  const recentVisitorMessages = await db.message.count({
    where: {
      authorType: "VISITOR",
      createdAt: {
        gt: new Date(Date.now() - 60_000),
      },
      conversation: {
        visitorSessionId: visitorSession.id,
      },
    },
  });

  if (recentVisitorMessages >= 10) {
    return Response.json(
      { error: "Too many messages. Wait a moment before trying again." },
      { status: 429 },
    );
  }

  const conversation = await recordVisitorMessage({
    db,
    visitorSession,
    text: latestText,
  });
  const widget = visitorSession.widget;

  try {
    const result = await streamWidgetAgent({
      config: {
        displayName: widget.displayName,
        instructions: widget.instructions,
        modelProvider: widget.modelProvider as WidgetModelProvider,
        modelName: widget.modelName,
        workspaceName: widget.workspace.name,
      },
      messages,
      onFinish: async ({ text, inputTokens, outputTokens }) => {
        if (!text.trim()) return;

        await recordAiMessage({
          db,
          conversationId: conversation.id,
          text,
        });

        console.info("widget.ai.response.completed", {
          workspaceId: widget.workspace.id,
          widgetId: widget.id,
          conversationId: conversation.id,
          inputTokens,
          outputTokens,
        });
      },
      onError: (error) => {
        console.error("widget.ai.response.failed", {
          workspaceId: widget.workspace.id,
          widgetId: widget.id,
          conversationId: conversation.id,
          error: error instanceof Error ? error.message : "Unknown model error",
        });
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("widget.ai.request.failed", {
      workspaceId: widget.workspace.id,
      widgetId: widget.id,
      conversationId: conversation.id,
      error: error instanceof Error ? error.message : "Unknown model error",
    });
    return Response.json({ error: "The assistant is unavailable right now." }, { status: 503 });
  }
}
