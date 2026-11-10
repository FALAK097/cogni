interface Env {
  INGESTION_QUEUE: Queue<IngestionMessage>;
  INGESTION_SHARED_SECRET: string;
}

type IngestionMessage = {
  workflowRunId: string;
  workspaceId: string;
  callbackUrl: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isIngestionMessage(value: unknown): value is IngestionMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  if (
    typeof message.workflowRunId !== "string" ||
    typeof message.workspaceId !== "string" ||
    typeof message.callbackUrl !== "string" ||
    !uuidPattern.test(message.workflowRunId) ||
    !uuidPattern.test(message.workspaceId)
  ) {
    return false;
  }

  try {
    return new URL(message.callbackUrl).protocol === "https:";
  } catch {
    return false;
  }
}

async function secretsMatch(actual: string, expected: string) {
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const actualBytes = new Uint8Array(actualHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let mismatch = 0;
  for (let index = 0; index < actualBytes.length; index += 1) {
    mismatch |= actualBytes[index] ^ expectedBytes[index];
  }
  return mismatch === 0;
}

async function isAuthorized(request: Request, env: Env) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  return secretsMatch(authorization.slice("Bearer ".length), env.INGESTION_SHARED_SECRET);
}

async function enqueue(request: Request, env: Env) {
  if (!(await isAuthorized(request, env))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!isIngestionMessage(body)) {
    return Response.json({ error: "Invalid ingestion job." }, { status: 400 });
  }

  await env.INGESTION_QUEUE.send(body, { contentType: "json" });
  return Response.json({ queued: true }, { status: 202 });
}

async function consumeMessage(message: Message<IngestionMessage>, env: Env) {
  if (!isIngestionMessage(message.body)) {
    console.error("Discarding malformed ingestion message", { messageId: message.id });
    message.ack();
    return;
  }

  try {
    const response = await fetch(message.body.callbackUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.INGESTION_SHARED_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflowRunId: message.body.workflowRunId,
        workspaceId: message.body.workspaceId,
      }),
    });

    if (response.ok || [400, 401, 404, 409, 422].includes(response.status)) {
      if (!response.ok) {
        console.error("Ingestion job was rejected permanently", {
          messageId: message.id,
          status: response.status,
          workflowRunId: message.body.workflowRunId,
        });
      }
      message.ack();
      return;
    }

    message.retry({ delaySeconds: Math.min(30 * 2 ** Math.max(message.attempts - 1, 0), 3600) });
  } catch (error) {
    console.error("Ingestion callback failed", {
      messageId: message.id,
      workflowRunId: message.body.workflowRunId,
      error: error instanceof Error ? error.message : "Unknown callback failure.",
    });
    message.retry({ delaySeconds: Math.min(30 * 2 ** Math.max(message.attempts - 1, 0), 3600) });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true });
    }
    if (request.method === "POST" && url.pathname === "/enqueue") {
      return enqueue(request, env);
    }
    return Response.json({ error: "Not found." }, { status: 404 });
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      await consumeMessage(message, env);
    }
  },
} satisfies ExportedHandler<Env, IngestionMessage>;
