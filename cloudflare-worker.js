// OpenNext generates this entrypoint at build time.
// @ts-ignore
import nextWorker from "./.open-next/worker.js";

// The OpenNext cache implementations use these durable object exports.
// @ts-ignore
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";

function getHost(request) {
  return new URL(request.url).hostname.toLowerCase().replace(/\.$/, "");
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = getHost(request);
    const appRoot = String(env.APP_ROOT_DOMAIN || "cogni.falakgala.dev").toLowerCase();

    // Permanent www redirect that preserves path and query.
    if (hostname === `www.${appRoot}`) {
      const target = new URL(url.toString());
      target.hostname = appRoot;
      return Response.redirect(target.toString(), 301);
    }

    // Redirect *.workers.dev subdomain access to canonical custom domain.
    if (hostname.endsWith(".workers.dev")) {
      const target = new URL(url.toString());
      target.hostname = appRoot;
      return Response.redirect(target.toString(), 301);
    }

    return nextWorker.fetch(request, env, ctx);
  },

  // Cloudflare Queue consumer for background knowledge ingestion jobs.
  async queue(batch, env) {
    const appRoot = String(env.APP_ROOT_DOMAIN || "cogni.falakgala.dev").toLowerCase();

    for (const message of batch.messages) {
      let body = message.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          console.error("Malformed queue message JSON, discarding:", message.id);
          message.ack();
          continue;
        }
      }

      if (!body || typeof body !== "object") {
        console.error("Malformed queue message body, discarding:", message.id);
        message.ack();
        continue;
      }

      const { workflowRunId, workspaceId, callbackUrl } = body;
      if (!workflowRunId || !workspaceId) {
        console.error("Missing required fields in ingestion job, discarding:", message.id);
        message.ack();
        continue;
      }

      const targetUrl = callbackUrl || `https://${appRoot}/api/internal/ingestion`;

      try {
        const caller = env.WORKER_SELF_REFERENCE ?? globalThis;
        const response = await caller.fetch(
          new Request(targetUrl, {
            method: "POST",
            headers: {
              authorization: `Bearer ${env.INGESTION_SHARED_SECRET || ""}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({ workflowRunId, workspaceId }),
          }),
        );

        if (response.ok || [400, 401, 404, 409, 422].includes(response.status)) {
          if (!response.ok) {
            console.error("Ingestion job returned non-retryable status:", response.status, {
              workflowRunId,
              messageId: message.id,
            });
          }
          message.ack();
        } else {
          console.error("Ingestion job temporary failure with status:", response.status, {
            workflowRunId,
            messageId: message.id,
          });
          const delaySeconds = Math.min(30 * 2 ** Math.max((message.attempts || 1) - 1, 0), 3600);
          message.retry({ delaySeconds });
        }
      } catch (error) {
        console.error("Ingestion queue dispatch error:", error?.message || error, {
          workflowRunId,
          messageId: message.id,
        });
        const delaySeconds = Math.min(30 * 2 ** Math.max((message.attempts || 1) - 1, 0), 3600);
        message.retry({ delaySeconds });
      }
    }
  },
};
