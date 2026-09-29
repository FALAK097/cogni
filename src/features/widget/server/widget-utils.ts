import "server-only";
import type { TextStreamPart, ToolSet } from "ai";

import type { MessageJson } from "@/features/conversations/server/conversation-service";

export type WidgetHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

export function toWidgetHistoryMessages(messages: MessageJson[]): WidgetHistoryMessage[] {
  return messages.map((message) => {
    return {
      id: message.id,
      role: message.authorType === "VISITOR" ? "user" : "assistant",
      content: message.body,
      createdAt: message.createdAt,
    };
  });
}

export function widgetHistoryToUiMessages(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return null;
  }

  let totalCharacters = 0;
  const history: { role: "user" | "assistant"; content: string }[] = [];

  for (const candidate of value) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("role" in candidate) ||
      (candidate.role !== "user" && candidate.role !== "assistant") ||
      !("content" in candidate) ||
      typeof candidate.content !== "string"
    ) {
      return null;
    }

    const content = candidate.content.trim();
    totalCharacters += content.length;
    if (!content || content.length > 4_000 || totalCharacters > 50_000) {
      return null;
    }

    history.push({ role: candidate.role, content });
  }

  return history.map((message, index) => ({
    id: `widget-${index}`,
    role: message.role === "user" ? ("user" as const) : ("assistant" as const),
    parts: [{ type: "text" as const, text: message.content }],
  }));
}

/** The SDK's textStream drops error/abort events; retain them until completion. */
export function createWidgetCompletion() {
  const completion = Promise.withResolvers<Error | null>();
  return {
    succeed: () => completion.resolve(null),
    fail: (error: unknown) =>
      completion.resolve(error instanceof Error ? error : new Error(String(error))),
    waitForCompletion: async () => {
      const error = await completion.promise;
      if (error) throw error;
    },
  };
}

/** Preserve model failures that the SDK omits from its text-only stream. */
export async function* readWidgetModelText<TOOLS extends ToolSet>(
  events: AsyncIterable<TextStreamPart<TOOLS>>,
): AsyncGenerator<string> {
  let completed = false;
  for await (const event of events) {
    if (event.type === "error") throw event.error;
    if (event.type === "abort") throw new Error("The assistant response was interrupted.");
    if (event.type === "text-delta") yield event.text;
    if (event.type === "finish") {
      if (event.finishReason === "error") throw new Error("The assistant response failed.");
      completed = true;
    }
  }
  if (!completed) throw new Error("The assistant stream ended before completion.");
}

export async function* interruptWidgetTextStream(
  textStream: AsyncIterable<string>,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const iterator = textStream[Symbol.asyncIterator]();
  let removeAbortListener = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    const rejectOnAbort = () =>
      reject(new Error("The response stopped because a teammate took over."));
    if (signal.aborted) {
      rejectOnAbort();
      return;
    }
    signal.addEventListener("abort", rejectOnAbort, { once: true });
    removeAbortListener = () => signal.removeEventListener("abort", rejectOnAbort);
  });

  try {
    while (true) {
      const next = await Promise.race([iterator.next(), interrupted]);
      if (next.done) return;
      yield next.value;
    }
  } finally {
    removeAbortListener();
    if (signal.aborted) await iterator.return?.();
  }
}

export function createWidgetSseStream(
  textStream: AsyncIterable<string>,
  options?: {
    onComplete?: () => Promise<void>;
    onFinally?: () => void;
    onCancel?: () => void;
  },
) {
  const encoder = new TextEncoder();
  let cancelled = false;

  return new ReadableStream({
    start(controller) {
      void (async () => {
        try {
          let hasText = false;
          for await (const chunk of textStream) {
            if (cancelled) return;
            if (chunk) {
              hasText ||= Boolean(chunk.trim());
              const frame = chunk
                .split("\n")
                .map((line) => `data: ${line}`)
                .join("\n");
              controller.enqueue(encoder.encode(`${frame}\n\n`));
            }
          }
          if (!hasText) throw new Error("The assistant returned an empty response.");
          await options?.onComplete?.();
          if (cancelled) return;
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          if (!cancelled) {
            controller.enqueue(encoder.encode("data: [ERROR]\n\n"));
            controller.close();
          }
        } finally {
          options?.onFinally?.();
        }
      })();
    },
    cancel() {
      cancelled = true;
      options?.onCancel?.();
      options?.onFinally?.();
    },
  });
}

export function withWidgetCors(response: Response, origin: string | null, allowed: boolean) {
  if (!origin || !allowed) return response;

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Expose-Headers", "X-Widget-Session-Id, X-Widget-Session-Token");
  headers.set("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function widgetPreflightResponse(request: Request) {
  const origin = request.headers.get("origin");
  const response = new Response(null, { status: 204 });

  if (!origin) return response;

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set(
    "Access-Control-Expose-Headers",
    "X-Widget-Session-Id, X-Widget-Session-Token",
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.set("Vary", "Origin");

  return response;
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
