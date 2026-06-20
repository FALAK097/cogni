import "server-only";

import { getVisitorConversationMessages } from "@/features/conversations/server/conversation-service";
import { uploadPublicPath } from "@/lib/storage/local";

export type EchoHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

export function toEchoHistoryMessages(
  messages: Awaited<ReturnType<typeof getVisitorConversationMessages>>,
): EchoHistoryMessage[] {
  return messages.map((message) => {
    const attachmentLines =
      message.attachments?.map(
        (attachment) => `${attachment.filename}: ${uploadPublicPath(attachment.storageKey)}`,
      ) ?? [];
    const content =
      attachmentLines.length > 0 ? `${message.body}\n${attachmentLines.join("\n")}` : message.body;

    return {
      id: message.id,
      role: message.authorType === "VISITOR" ? "user" : "assistant",
      content,
      createdAt: message.createdAt.toISOString(),
    };
  });
}

export function echoHistoryToUiMessages(history: { role: string; content: string }[]) {
  return history.map((message, index) => ({
    id: `echo-${index}`,
    role: message.role === "user" ? ("user" as const) : ("assistant" as const),
    parts: [{ type: "text" as const, text: message.content }],
  }));
}

export function createEchoSseStream(
  textStream: AsyncIterable<string>,
  options?: { onComplete?: () => Promise<void> },
) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of textStream) {
          if (chunk) {
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          }
        }
        await options?.onComplete?.();
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch {
        controller.enqueue(encoder.encode("data: [ERROR]\n\n"));
        controller.close();
      }
    },
  });
}

export function withWidgetCors(response: Response, origin: string | null, allowed: boolean) {
  if (!origin || !allowed) return response;

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function getRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const referer = request.headers.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}
