# Background jobs

Knowledge ingestion uses Cloudflare Queues for durable delivery and the existing PostgreSQL
`workflow_run` table for tenant-scoped status, idempotency, attempts, audit history, and dashboard
visibility.

## Decision

| Option                          | Strength                                                                | Trade-off                                                        | Decision                              |
| ------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------- |
| Next.js `after()` + Vercel Cron | No additional service                                                   | Invocation-bound work; Hobby cron recovery is daily              | Local and emergency fallback only     |
| Vercel Queues                   | Native Vercel delivery and retries                                      | Public beta, 24-hour retention, no built-in DLQ                  | Not selected                          |
| Vercel Workflow                 | Durable application steps                                               | More useful for long-lived orchestration than one ingestion task | Keep for future evaluation            |
| Cloudflare Queues               | At-least-once delivery, retries, backoff, DLQ, Cloudflare observability | Requires a small Worker                                          | Selected                              |
| Cloudflare Workflows            | Durable multi-step state, waits, per-step retries                       | Would move or duplicate Node PDF/DOCX and Neon processing        | Use later for crawl/fan-out pipelines |

Cloudflare Queues fits the current task boundary: one message invokes one idempotent document
processing operation. Cloudflare Workflows becomes appropriate when website ingestion is split into
durable crawl, per-page extraction, indexing, and approval/wait steps.

## Request flow

```text
Authenticated Next.js route/action
  -> store source in R2 or validate URL
  -> insert document + QUEUED workflow_run in Neon
  -> signed POST to Cloudflare Worker /enqueue
  -> Cloudflare Queue (at-least-once)
  -> Worker consumer signed POST to /api/internal/ingestion
  -> atomically claim workflow_run
  -> extract with the existing Node pipeline
  -> write chunks to Neon and upload to Cloudflare AI Search
  -> mark document/workflow complete
```

Only `workspaceId`, `workflowRunId`, and the callback URL enter the queue. File content, database
credentials, provider tokens, and customer messages remain outside queue payloads.

Duplicate delivery is safe because the callback atomically changes a run from `QUEUED`/`FAILED`
to `RUNNING`. Completed, cancelled, dead, or already-running jobs are acknowledged without running
again. Transient callback failures retry with exponential delay; exhausted transport failures enter
`cogni-ingestion-dlq`.

## Configuration

Cloudflare resources:

- Worker: `cogni-ingestion-queue`
- Queue: `cogni-ingestion`
- Dead-letter queue: `cogni-ingestion-dlq`
- Worker secret: `INGESTION_SHARED_SECRET`

Vercel and local server variables:

- `CLOUDFLARE_INGESTION_QUEUE_URL=https://cogni-ingestion-queue.widget-chat.workers.dev/enqueue`
- `INGESTION_SHARED_SECRET`: the same random secret installed in the Worker
- `BETTER_AUTH_URL`: the public HTTPS application origin used for the private callback
- `CRON_SECRET`: protects the daily database reconciliation sweep

`INGESTION_SHARED_SECRET` must be at least 32 characters and must never be exposed to the browser.
The internal callback compares it in constant time. Local HTTP development deliberately uses the
post-response database drain because a Cloudflare Worker cannot call a localhost URL.

## Operations

```bash
pnpm cf:check
pnpm cf:deploy
pnpm exec wrangler queues list
pnpm exec wrangler tail cogni-ingestion-queue
```

The daily Vercel cron remains a reconciliation safety net for database rows committed immediately
before an unlikely queue-publish outage. It is not the primary worker.
