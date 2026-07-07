# Teammate Implementation Plan

Last updated: 2026-07-07

Source inputs:

- GitHub milestones: https://github.com/FALAK097/widget/milestones
- Product roadmap: `docs/product-roadmap.md`
- Project engineering rules: `AGENTS.md`
- Current codebase inspection on 2026-07-07

This document is meant to be handed to a teammate so they can pick up milestone work directly. It translates the roadmap and GitHub issues into implementation slices, ownership boundaries, dependencies, acceptance criteria, and the repo files they should inspect before coding.

## Product Goal

Build `widget` into an AI-first support and product feedback suite:

1. The embedded widget answers from workspace knowledge.
2. Human teammates take over in a shared inbox.
3. Conversations become tickets, leads, customer history, and product feedback.
4. AI runs are observable, quality-scored, and safe to let act through tools.
5. Integrations and channels turn support conversations into completed work.

The near-term sellable wedge is not "everything Intercom/Chatwoot/Productlane does." It is:

- Embedded AI support widget.
- Shared team inbox.
- Tickets and customer profiles.
- Knowledge ingestion and improvement loop.
- Approved AI actions through integrations.

## Non-Negotiable Engineering Rules

Every issue must preserve these project invariants:

- Local dev uses SQLite through Drizzle. Production uses Cloudflare D1.
- Schema changes start in `src/lib/db/schema.ts`.
- Generate migrations with `pnpm db:generate -- --name <name>`.
- Apply local migrations with `pnpm db:migrate`.
- Use `WorkspaceMember`, not legacy `Membership`.
- Store `Widget.authorizedDomains` as a JSON string array on `Widget`.
- Store `Conversation.messages` as a JSON string array on `Conversation`.
- Do not add a separate `Message` table unless the invariant is explicitly changed.
- Link `Attachment` directly to `Conversation` through `conversationId`.
- Every dashboard/database query must be scoped to `workspaceId` and guarded by membership.
- Google OAuth remains the only auth method.
- Avoid `any`. Use Zod at API, form, tool, workflow, queue, and webhook boundaries.
- Do not rely on in-memory state across requests for production behavior.
- Use idempotency keys for queues, workflows, action execution, and webhook delivery.
- Format with `pnpm fmt`, lint with `pnpm lint`, typecheck with `pnpm typecheck`.
- Use Conventional Commit messages.

## Current Repo Map

Start here before implementing any milestone issue:

| Area                       | Files/directories                                                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database schema            | `src/lib/db/schema.ts`, `src/lib/db/relations.ts`, `drizzle/`                                                                                                                |
| Auth and workspace context | `src/lib/auth/dashboard-context.ts`, `src/lib/auth/server.ts`, `src/features/workspaces/*`                                                                                   |
| Public widget APIs         | `src/app/api/widget/[publicKey]/*`                                                                                                                                           |
| Widget runtime             | `public/widget.js`, `public/widget/*`, `scripts/build-widget.js`                                                                                                             |
| Widget dashboard UI        | `src/app/(dashboard)/widget/page.tsx`, `src/components/widget/*`, `src/features/widget/*`                                                                                    |
| Conversations              | `src/app/(dashboard)/conversations/page.tsx`, `src/app/api/dashboard/conversations/*`, `src/features/conversations/*`, `src/components/widget/conversation-*`                |
| Knowledge base             | `src/app/(dashboard)/knowledge-base/page.tsx`, `src/app/api/dashboard/knowledge-base/*`, `src/features/knowledge/*`, `src/components/workspace/widget-knowledge-manager.tsx` |
| AI runtime                 | `src/features/widget/server/widget-agent.ts`, `src/lib/ai/*`, `src/app/api/widget/[publicKey]/chat/route.ts`                                                                 |
| Integrations               | `src/app/(dashboard)/integrations/page.tsx`, `src/features/integrations/*`, `src/components/integrations/*`, `src/lib/integrations/*`                                        |
| Workflows/jobs             | `src/lib/workflows/runner.ts`, `src/lib/events/domain-events.ts`, `src/lib/notifications/create-notification.ts`                                                             |
| Analytics                  | `src/app/(dashboard)/dashboard/page.tsx`, `src/app/api/dashboard/analytics/route.ts`, `src/hooks/query/use-dashboard-analytics.ts`                                           |

## Current Implementation Snapshot

Already present:

- Next.js 16, React 19, TypeScript, Tailwind v4, Drizzle, Better Auth, TanStack Query/Table.
- Google-only auth, workspace provisioning, invites, workspace switcher.
- Dashboard shell, widget settings, knowledge manager, conversations, integrations catalog, analytics.
- Public widget loader/runtime and APIs for config, session, chat, feedback, uploads, documents, lead capture, identify, history.
- AI SDK 7 is already installed in `package.json` as `ai@7.0.11`.
- Streamdown is already installed in `package.json`.
- `agent_run`, `workflow_run`, and `integration_action` tables already exist in `src/lib/db/schema.ts`.
- Agent telemetry helper calls are already wired in `src/app/api/widget/[publicKey]/chat/route.ts`.
- Basic workflow runner exists in `src/lib/workflows/runner.ts`.
- Integration tool registry exists, but it is still placeholder-level.

Important implication:

- Issues #44 and #42 are closed. Do not re-run a broad AI SDK or Streamdown migration unless a new bug proves it is incomplete.
- For the remaining issues, build on the existing `agentRun`, `workflowRun`, `integrationAction`, Streamdown, and AI SDK 7 foundations instead of replacing them.

## Milestone Summary

| Milestone                    | Due date   | Goal                                                                            | GitHub state     |
| ---------------------------- | ---------- | ------------------------------------------------------------------------------- | ---------------- |
| M0 - Foundation Hardening    | 2026-07-18 | Testing, AI SDK 7, markdown, forms, Cloudflare job/runtime rails                | 3 open, 3 closed |
| M1 - Core Support Suite      | 2026-08-08 | Realtime inbox, chat polish, tickets, customer profiles, email, reporting       | 6 open           |
| M2 - AI Agent Platform       | 2026-09-05 | Copilot, tools, approvals, integration health, AI QA, optimization loop         | 7 open           |
| M3 - Knowledge + Omnichannel | 2026-09-26 | Source health, scheduled sync, Chat SDK adapters, developer API, lead dashboard | 4 open           |
| M4 - Growth + Product Ops    | 2026-10-24 | Feedback portal, roadmap, changelog, proactive campaigns, billing               | 4 open           |

## Recommended Build Order

Use this order unless the GitHub issue is reassigned or explicitly reprioritized:

1. #41 TanStack Form migration pattern
2. #24 Queue-backed async ingestion and retries
3. #25 Cloudflare Workflows for durable source sync
4. #20 Realtime conversation rooms with Durable Objects
5. #40 Chat UI component polish pass
6. #21 Ticket lifecycle MVP
7. #29 Customer intelligence profiles
8. #26 Cloudflare Email Sending channel
9. #36 Reporting builder and saved analytics views
10. #22 Agent inbox copilot
11. #23 Composio tool connections and action approvals
12. #45 AI action workflow engine MVP
13. #46 Appointment booking workflow MVP
14. #37 Integration marketplace with connection health
15. #31 AI evaluation and QA scoring
16. #32 Unanswered questions optimization center
17. #28 Knowledge source health and scheduled sync
18. #27 Chat SDK adapter foundation
19. #39 Developer API keys and webhooks
20. #30 Lead qualification dashboard
21. #34 Feedback portal and roadmap MVP
22. #35 Changelog publishing
23. #33 Proactive outbound campaigns MVP
24. #38 Billing, usage limits, and plan gates

## Standard Vertical Slice Checklist

For each issue, implement the full slice unless the issue explicitly says otherwise:

- Schema and migration, if new persistent data is needed.
- Server/domain logic under `src/features/*/server` or `src/lib/*`.
- Route handler API under `src/app/api/*`.
- Dashboard or widget UI.
- TanStack Query hooks/cache invalidation for dashboard reads/writes.
- Zod validation at all boundaries.
- Workspace membership checks for all dashboard data.
- Domain events for support-relevant mutations.
- Idempotency keys for retriable/side-effecting work.
- Focused tests when the issue changes multi-tenancy, parsing, jobs, tool execution, or billing gates.
- Manual smoke path.
- Verification commands.

Default verification:

```bash
pnpm fmt
pnpm lint
pnpm typecheck
SKIP_ENV_VALIDATION=1 pnpm build
```

If tests exist or are added:

```bash
pnpm test
```

## M0 - Foundation Hardening

Milestone URL: https://github.com/FALAK097/widget/milestone/1

Goal: finish the rails that let later feature work happen safely: form conventions, queue-backed ingestion, durable workflow patterns, and already-completed AI/markdown/test foundations.

### Closed M0 Work

#### #43 Test coverage foundation

Status: closed.

Use this as context only. Do not reopen unless CI or `pnpm test` coverage is missing from current expectations.

#### #44 AI SDK 7 migration and agent telemetry

Status: closed.

Current code already has:

- `ai@7.0.11` in `package.json`.
- `agent_run` table in `src/lib/db/schema.ts`.
- Telemetry helpers in `src/lib/ai/telemetry.ts`.
- Widget chat telemetry wiring in `src/app/api/widget/[publicKey]/chat/route.ts`.

Future issues should extend this foundation instead of doing a second migration.

#### #42 Streamdown migration for AI markdown

Status: closed.

Current code already has `streamdown` in `package.json`. Future chat UI work should reuse the shared markdown renderer rather than adding another markdown stack.

### #41 TanStack Form Migration Pattern

GitHub: https://github.com/FALAK097/widget/issues/41

Assignee: `nikamritessh`

Priority: P1. Size: M. Estimate: 5. Target date: 2026-07-13.

Goal:

- Create a standard TanStack Form + Zod pattern for settings-heavy dashboard work.

Current state:

- Forms still mix server actions and React Hook Form patterns.
- `@tanstack/react-query` and `@tanstack/react-table` exist.
- TanStack Form does not appear in `package.json` yet.
- Widget settings currently live in `src/features/widget/actions.ts` and `src/components/widget/widget-settings-panels.tsx`.

Implementation plan:

1. Add TanStack Form dependency if not already present.
2. Pick one high-value form to migrate first. Recommended: widget agent/settings form, because it is isolated and heavily used.
3. Create shared helpers for:
   - Zod validation.
   - Field error display.
   - Pending/submitting state.
   - Reset to server values.
   - Optimistic save only where server state is straightforward.
4. Keep server action or route handler semantics consistent with the current code. Do not introduce a second API style unless needed.
5. Document the pattern in either this file or a focused `docs/forms.md`.

Files to inspect:

- `src/features/widget/actions.ts`
- `src/features/widget/components/agent-settings-form.tsx`
- `src/components/widget/widget-settings-panels.tsx`
- `src/hooks/query/*`

Acceptance criteria:

- Migrated form preserves current behavior.
- Validation, pending, success, and error states are accessible.
- Pattern is documented clearly enough for future dashboard forms.
- No `any`.

Manual smoke:

- Open widget settings.
- Edit text/color/domain fields.
- Submit valid data.
- Submit invalid data.
- Reload and confirm persisted values.

Verification:

```bash
pnpm fmt
pnpm lint
pnpm typecheck
SKIP_ENV_VALIDATION=1 pnpm build
```

### #24 Queue-Backed Async Ingestion and Retries

GitHub: https://github.com/FALAK097/widget/issues/24

Assignee: `FALAK097`

Priority: P0. Size: L. Estimate: 8. Target date: 2026-07-15.

Goal:

- Move knowledge ingestion and long-running jobs off the request lifecycle using Cloudflare Queues with a local fallback.

Current state:

- Knowledge upload, URL, and sitemap work is mostly request-bound.
- `src/features/knowledge/server/crawl.ts` performs bounded fetch/crawl work.
- `document` and `document_chunk` tables exist.
- `workflow_run` exists but does not replace queue processing.

Implementation plan:

1. Define queue payload types with Zod:
   - `workspaceId`
   - `documentId` or source ID
   - source type: manual, URL, sitemap, upload
   - idempotency key
   - attempt metadata
2. Add Cloudflare queue binding and generated types.
3. Add a local fallback so dev can process without deployed Queues.
4. Change upload/URL/sitemap endpoints to:
   - validate request
   - create or update source/document status to queued
   - enqueue job
   - return quickly with processing status
5. Implement consumer:
   - fetch/extract
   - chunk
   - index in AI Search/local fallback
   - update status, counts, timestamps, error message
6. Add retry/dead-letter visible state.
7. Ensure duplicate idempotency keys do not duplicate chunks.

Files to inspect:

- `src/app/api/dashboard/knowledge-base/*`
- `src/features/knowledge/actions.ts`
- `src/features/knowledge/server/process-document.ts`
- `src/features/knowledge/server/crawl.ts`
- `src/features/knowledge/server/chunk.ts`
- `src/features/knowledge/server/retrieval.ts`
- `src/lib/search/cloudflare-search.ts`
- `open-next.config.ts`
- `wrangler` or Cloudflare config files if present

Acceptance criteria:

- Requests return quickly.
- Successful job creates chunks/search entries.
- Failure records error and can be retried.
- Duplicate jobs do not duplicate chunks.

Manual smoke:

- Upload a small document.
- Add a single URL.
- Add a sitemap URL.
- Confirm sources move through queued/processing/completed or failed states.
- Retry a failed job.

Verification:

```bash
pnpm fmt
pnpm lint
pnpm typecheck
SKIP_ENV_VALIDATION=1 pnpm build
```

### #25 Cloudflare Workflows for Durable Source Sync

GitHub: https://github.com/FALAK097/widget/issues/25

Assignee: `FALAK097`

Priority: P0. Size: L. Estimate: 8. Target date: 2026-07-19.

Dependencies:

- #24

Goal:

- Use Cloudflare Workflows for resumable multi-step source sync and future approved AI action orchestration.

Current state:

- `workflow_run` table exists.
- `src/lib/workflows/runner.ts` can start, complete, and fail local workflow records.
- No full Cloudflare Workflow binding or source sync workflow is present.

Implementation plan:

1. Add Workflow binding/typegen.
2. Define durable source sync workflow steps:
   - fetch
   - extract
   - chunk
   - index
   - finalize
3. Reuse #24 queue conventions for payloads, idempotency, and retries.
4. Persist run status in `workflow_run` or extend schema if step-level state is needed.
5. Add UI fields in knowledge base source list/detail:
   - latest run status
   - latest error
   - started/finished timestamps
   - retry action
6. Keep runtime stateless across requests.

Acceptance criteria:

- Manual sync starts workflow.
- Transient failures can retry.
- Dashboard shows run status/error.
- Same idempotency key reuses run.

Manual smoke:

- Trigger sync from KB UI.
- Confirm run status changes.
- Simulate failure and retry.
- Confirm duplicate trigger does not duplicate chunks.

## M1 - Core Support Suite

Milestone URL: https://github.com/FALAK097/widget/milestone/2

Goal: turn the current widget plus dashboard into a support product a team can use daily.

### #20 Realtime Conversation Rooms With Durable Objects

GitHub: https://github.com/FALAK097/widget/issues/20

Assignee: `FALAK097`

Priority: P0. Size: XL. Estimate: 13. Target date: 2026-07-27.

Goal:

- Replace polling-first inbox behavior with Durable Object rooms for messages, typing, read state, assignment/status events, and AI stream state.

Current state:

- Dashboard uses polling.
- Widget streams AI to the visitor only.
- No Durable Object namespace/protocol exists.

Implementation plan:

1. Add a per-conversation Durable Object namespace.
2. Define event protocol with Zod:
   - `message.created`
   - `typing.started`
   - `typing.stopped`
   - `read.updated`
   - `conversation.assigned`
   - `conversation.status_changed`
   - `ai_stream.started`
   - `ai_stream.delta`
   - `ai_stream.completed`
   - `ai_stream.failed`
3. Authenticate dashboard subscribers by workspace membership.
4. Authenticate widget subscribers by public widget session token and conversation/session ownership.
5. Keep polling fallback in TanStack Query for reliability.
6. Use client IDs/idempotency to dedupe duplicate sends.
7. Persist durable data in D1, not DO memory. Use DO for ordering, fanout, ephemeral state, and dedupe.

Files to inspect:

- `src/app/api/dashboard/conversations/*`
- `src/app/api/widget/[publicKey]/chat/route.ts`
- `src/app/api/widget/[publicKey]/message/route.ts`
- `src/features/conversations/server/conversation-service.ts`
- `src/components/widget/conversation-detail.tsx`
- `src/components/widget/conversations-list.tsx`
- `public/widget/api.js`
- `public/widget/state.js`
- `public/widget/ui.js`

Acceptance criteria:

- Visitor/team messages appear without refresh.
- Typing/read events are ephemeral.
- Duplicate client IDs remain idempotent.
- Fallback polling works.

Manual smoke:

- Open widget in one browser and dashboard in another.
- Send visitor message and human reply.
- Confirm both sides update without refresh.
- Disconnect realtime path and confirm polling still updates.

### #40 Chat UI Component Polish Pass

GitHub: https://github.com/FALAK097/widget/issues/40

Assignee: `nikamritessh`

Priority: P1. Size: M. Estimate: 5. Target date: 2026-07-28.

Dependencies:

- #42

Goal:

- Modernize chat surfaces with shared message, bubble, attachment, scrollbar, marker, feedback, citation, and streaming primitives.

Implementation plan:

1. Inventory dashboard and widget chat rendering differences.
2. Create reusable primitives where feasible for dashboard React components.
3. Apply equivalent stable markup/classes to widget runtime where bundle constraints prevent direct React reuse.
4. Reuse Streamdown renderer for AI markdown.
5. Ensure message content wraps on mobile and long words/URLs do not overflow.
6. Verify keyboard behavior and focus states.

Files to inspect:

- `src/components/widget/conversation-detail.tsx`
- `src/components/widget/widget-conversations.tsx`
- `src/components/widget/widget-live-preview.tsx`
- `public/widget/ui.js`
- `public/widget/styles.js`
- `public/widget/feedback.js`

Acceptance criteria:

- No mobile/desktop overlap.
- Attachments/citations are clear.
- Streaming, typing, and read states are stable.
- Keyboard navigation remains usable.

### #21 Ticket Lifecycle MVP

GitHub: https://github.com/FALAK097/widget/issues/21

Assignee: `nikamritessh`

Priority: P0. Size: L. Estimate: 8. Target date: 2026-08-02.

Goal:

- Add first-class tickets linked to conversations and contacts.

Current state:

- Conversations have status and assignee only.
- No `ticket` table exists.

Implementation plan:

1. Add `ticket` table:
   - `id`
   - `number`
   - `title`
   - `description`
   - `status`
   - `priority`
   - `type`
   - `source`
   - `dueAt`
   - `firstResponseDueAt`
   - `resolutionDueAt`
   - `createdAt`
   - `updatedAt`
   - `workspaceId`
   - `contactId`
   - `conversationId`
   - `assignedMemberId`
2. Add indexes for workspace/status/priority/assignee/due date.
3. Add dashboard APIs:
   - list tickets
   - create ticket
   - update ticket
   - get ticket detail
4. Add ticket list/detail UI with TanStack Table/Query.
5. Add "create ticket from conversation" in conversation detail.
6. Show linked ticket context in conversation timeline/detail.
7. Add cross-workspace tests if test harness exists.

Files to inspect:

- `src/lib/db/schema.ts`
- `src/app/api/dashboard/conversations/*`
- `src/components/widget/conversation-detail.tsx`
- `src/features/workspaces/queries.ts`
- `src/lib/auth/dashboard-context.ts`

Acceptance criteria:

- Agent can create/update ticket.
- Ticket is workspace-scoped.
- Conversation compatibility remains.
- Cross-workspace tests exist where test harness supports them.

### #29 Customer Intelligence Profiles

GitHub: https://github.com/FALAK097/widget/issues/29

Assignee: `nikamritessh`

Priority: P0. Size: L. Estimate: 8. Target date: 2026-08-06.

Dependencies:

- #21

Goal:

- Turn contacts into support profiles with tags, custom fields, events, sessions, conversations, tickets, leads, and timeline.

Current state:

- `contact` has basic fields and tags.
- `contact_note` exists.
- Conversation detail shows limited contact context.

Implementation plan:

1. Add contact profile route/page.
2. Add editable tags and custom fields.
3. Add timeline data:
   - sessions
   - conversations
   - tickets
   - leads
   - notes
   - identify events
4. Update identify API safely so it enriches profile without overwriting better known data unexpectedly.
5. Add navigation from conversation detail to contact profile.
6. Keep all reads scoped to workspace.

Files to inspect:

- `src/app/api/widget/[publicKey]/identify/route.ts`
- `src/app/api/dashboard/conversations/[conversation_id]/route.ts`
- `src/features/conversations/*`
- `src/components/widget/conversation-detail.tsx`
- `src/lib/db/schema.ts`

Acceptance criteria:

- Agent opens profile from conversation.
- Agent edits tags/fields.
- Timeline shows latest activity.
- Identify enriches profile safely.

### #26 Cloudflare Email Sending Channel

GitHub: https://github.com/FALAK097/widget/issues/26

Assignee: `nikamritessh`

Priority: P1. Size: L. Estimate: 8. Target date: 2026-08-09.

Dependencies:

- #21

Goal:

- Add email as the first non-widget support channel for replies, notifications, invites, and threaded support conversations.

Implementation plan:

1. Add Cloudflare Email Sending binding/config docs.
2. Add sender/domain config model if needed.
3. Add outbound support reply from conversation/ticket.
4. Store provider IDs, headers, thread IDs, status, and failure metadata.
5. Add timeline event for sent/failed email.
6. Add retry path if async.
7. Guard sending by workspace membership and contact email availability.

Acceptance criteria:

- Agent can send email reply.
- Reply appears in timeline.
- Failures are visible.
- No send without workspace permission.

### #36 Reporting Builder and Saved Analytics Views

GitHub: https://github.com/FALAK097/widget/issues/36

Assignee: `nikamritessh`

Priority: P2. Size: M. Estimate: 5. Target date: 2026-08-09.

Dependencies:

- #21

Goal:

- Move fixed analytics into saved support operations reports with filters and exports.

Implementation plan:

1. Add saved report schema scoped to workspace and creator.
2. Support filters:
   - date range
   - channel
   - conversation status
   - assignee
   - ticket status/priority
   - AI handled/escalated
3. Add builder UI with chart/table modes.
4. Add CSV export route.
5. Preserve existing dashboard metrics.

Files to inspect:

- `src/app/api/dashboard/analytics/route.ts`
- `src/hooks/query/use-dashboard-analytics.ts`
- `src/components/dashboard/dashboard-page.tsx`

Acceptance criteria:

- User can save and reopen report.
- Saved views are workspace-scoped.
- CSV export works.
- Existing metrics remain.

## M2 - AI Agent Platform

Milestone URL: https://github.com/FALAK097/widget/milestone/3

Goal: make AI controllable, auditable, and capable of approved actions.

### #22 Agent Inbox Copilot

GitHub: https://github.com/FALAK097/widget/issues/22

Assignee: `nikamritessh`

Priority: P0. Size: L. Estimate: 8. Target date: 2026-08-15.

Dependencies:

- #44

Goal:

- Give human agents AI summaries, draft replies, and next-action suggestions without auto-sending.

Implementation plan:

1. Add copilot route handler under dashboard API.
2. Use AI SDK 7 runtime context:
   - workspace
   - conversation
   - contact
   - channel
   - plan
   - current agent mode
3. Support actions:
   - summarize conversation
   - draft reply
   - suggest next action
   - draft ticket
   - draft feedback item
4. Render editable drafts in conversation detail.
5. Never auto-send a draft.
6. Log copilot runs in `agent_run`.
7. Cite KB sources/actions where used.

Acceptance criteria:

- Agent can generate summary/draft.
- Draft never auto-sends.
- Agent edits before send.
- Copilot run is audited.

### #23 Composio Tool Connections and Action Approvals

GitHub: https://github.com/FALAK097/widget/issues/23

Assignee: `FALAK097`

Priority: P0. Size: XL. Estimate: 13. Target date: 2026-08-24.

Dependencies:

- #44

Goal:

- Turn placeholder integration actions into real Composio/internal tools with AI SDK 7 context, approvals, idempotency, and audit logs.

Current state:

- Integration catalog exists.
- `src/features/integrations/server/tool-registry.ts` is placeholder-level.
- `integration_action` table exists.

Implementation plan:

1. Add connection model for Composio-backed providers.
2. Implement one external tool, preferably Google Calendar or Gmail.
3. Implement two internal tools:
   - create ticket
   - add internal note or assign conversation
4. Define Zod schemas for every tool input and output.
5. Define typed tool context:
   - workspaceId
   - actor user/member
   - conversation/contact
   - approval policy
   - idempotency key
6. Use AI SDK 7 tool approvals for side effects.
7. Persist approval request, action input/result/error, actor, and idempotency key.
8. Add minimal approval UI in conversation/integration action surface.

Acceptance criteria:

- Workspace connects one app.
- AI proposes action.
- Agent approval is required.
- Approved action executes once and stores result.

### #45 AI Action Workflow Engine MVP

GitHub: https://github.com/FALAK097/widget/issues/45

Assignee: `FALAK097`

Priority: P0.

Dependencies:

- #44
- #23
- #24
- #25

Goal:

- Build the durable action workflow layer for multi-step customer request flows.

Implementation plan:

1. Extend current `workflow_run` if needed for:
   - queued
   - running
   - waiting_for_user
   - waiting_for_approval
   - completed
   - failed
   - cancelled
2. Add workflow step persistence if current single-row `workflow_run` is insufficient.
3. Support typed workflow inputs/outputs.
4. Connect workflow runs to conversations.
5. Persist action inputs, outputs, errors, retry metadata, and actor type.
6. Emit structured timeline events.
7. Keep design compatible with Cloudflare Workflows.

Acceptance criteria:

- Workflow run can be created from a conversation with typed input.
- Workflow can execute multiple ordered steps and persist step state.
- Steps can request human approval before continuing.
- Progress is visible as structured conversation/timeline data.
- Failed steps persist error details and can be retried or cancelled.

### #46 Appointment Booking Workflow MVP

GitHub: https://github.com/FALAK097/widget/issues/46

Assignee: `nikamritessh`

Priority: P0.

Dependencies:

- #45
- #23 if using a real calendar tool
- #40

Goal:

- Ship the first concrete action workflow: customer asks for an appointment, AI checks availability, offers slots, books, confirms, and notifies the team.

Implementation plan:

1. Add booking workflow template using #45 contract.
2. Add dashboard booking settings:
   - timezone
   - meeting length
   - buffer
   - allowed days
   - fallback/handoff message
   - notification channel
3. Add typed mock calendar adapter first if real Composio calendar is not ready.
4. Add widget UI states:
   - slot selection
   - confirmation
   - booked
   - failure fallback
5. Add inbox timeline states and appointment details.
6. Add typed notification event.

Acceptance criteria:

- Admin configures booking settings.
- Customer requests booking and sees slots.
- Customer selects a slot and receives confirmation.
- Inbox shows workflow state and appointment details.
- Failure state gives fallback and agent-visible context.

### #37 Integration Marketplace With Connection Health

GitHub: https://github.com/FALAK097/widget/issues/37

Assignee: `nikamritessh`

Priority: P1. Size: M. Estimate: 5. Target date: 2026-08-28.

Dependencies:

- #23

Goal:

- Make integrations manageable with detail pages, health checks, status, permissions, logs, and disconnect flows.

Implementation plan:

1. Add integration detail page.
2. Show auth/scopes/last action/last error/health/disconnect.
3. Add action log table using `integration_action`.
4. Add provider health check abstraction.
5. Handle missing config gracefully.

Acceptance criteria:

- User inspects app health.
- Failed actions are searchable.
- Disconnect works.
- Missing config is handled.

### #31 AI Evaluation and QA Scoring

GitHub: https://github.com/FALAK097/widget/issues/31

Assignee: `FALAK097`

Priority: P0. Size: L. Estimate: 8. Target date: 2026-09-01.

Dependencies:

- #44

Goal:

- Score AI and human interactions for helpfulness, grounding, sentiment, topics, and escalation quality after conversations.

Implementation plan:

1. Add eval/quality schema.
2. Queue post-conversation eval jobs.
3. Use structured AI output with Zod validation.
4. Score:
   - helpfulness
   - grounding
   - escalation appropriateness
   - sentiment
   - topic
   - deflection
5. Store score, reasons, model metadata, and source refs.
6. Create low-score signal for optimization center.

Acceptance criteria:

- Inactive/closed conversations get QA score.
- Dashboard shows score/reasons.
- Low score creates improvement signal.
- Tests cover parser/scoping.

### #32 Unanswered Questions Optimization Center

GitHub: https://github.com/FALAK097/widget/issues/32

Assignee: `nikamritessh`

Priority: P1. Size: M. Estimate: 5. Target date: 2026-09-06.

Dependencies:

- #31

Goal:

- Expose weak answers, missing knowledge, low confidence, and negative feedback as improvement tasks.

Implementation plan:

1. Add optimization center page.
2. List unanswered, low-confidence, negative feedback, and low-grounding cases.
3. Link source conversation.
4. Suggest KB snippet or Q&A fix.
5. Allow create KB snippet/Q&A or ignore.
6. Track open/resolved/ignored counts and trends.

Acceptance criteria:

- User sees top gaps.
- User creates KB snippet from a gap.
- Ignored gaps hide by default.
- Open/resolved counts exist.

## M3 - Knowledge + Omnichannel

Milestone URL: https://github.com/FALAK097/widget/milestone/4

Goal: improve knowledge reliability and add foundations for external channels and developer integrations.

### #28 Knowledge Source Health and Scheduled Sync

GitHub: https://github.com/FALAK097/widget/issues/28

Assignee: `FALAK097`

Priority: P1.

Dependencies:

- #25

Plan:

- Add source health fields and UI: last sync, next sync, interval, hash, chunk count, retrieval coverage, latest error.
- Add scheduled sync job.
- Add manual resync.
- Add incremental reindex where possible.
- Keep source sync idempotent.

### #27 Chat SDK Adapter Foundation

GitHub: https://github.com/FALAK097/widget/issues/27

Assignee: `FALAK097`

Priority: P1.

Dependencies:

- #21
- #23

Plan:

- Define normalized inbound/outbound channel event contract.
- Add adapter boundary before implementing many channels.
- Reuse conversation, ticket, contact, and tool approval systems.
- Do not special-case each channel in core conversation logic.

### #39 Developer API Keys and Webhooks

GitHub: https://github.com/FALAK097/widget/issues/39

Assignee: `FALAK097`

Priority: P1.

Dependencies:

- #24

Plan:

- Add API key schema with hashed secrets.
- Add webhook endpoint schema and delivery table.
- Add signed webhook delivery with retries/dead-letter state.
- Add dashboard management UI.
- Add docs for supported events.

### #30 Lead Qualification Dashboard

GitHub: https://github.com/FALAK097/widget/issues/30

Assignee: `nikamritessh`

Priority: P1.

Dependencies:

- #29

Plan:

- Build lead list/table from existing `lead` and `widget_lead_capture` data.
- Add lead status, owner, score, source, last activity.
- Show qualification details from conversation/form data.
- Add filters and routing-ready fields.

## M4 - Growth + Product Ops

Milestone URL: https://github.com/FALAK097/widget/milestone/5

Goal: convert support conversations into growth, feedback, roadmap, changelog, and billing operations.

### #34 Feedback Portal and Roadmap MVP

GitHub: https://github.com/FALAK097/widget/issues/34

Assignee: `nikamritessh`

Priority: P1.

Dependencies:

- #29

Plan:

- Add feedback item, vote, roadmap item schema.
- Allow converting conversation/customer signal into feedback.
- Add internal feedback board.
- Add public roadmap view with planned/in-progress/shipped states.
- Add identity guardrails for votes.

### #35 Changelog Publishing

GitHub: https://github.com/FALAK097/widget/issues/35

Assignee: `nikamritessh`

Priority: P2.

Dependencies:

- #34

Plan:

- Add changelog entry schema.
- Link changelog entries to roadmap items.
- Add draft/published states.
- Add public changelog page.
- Prepare notification hooks for later customer updates.

### #33 Proactive Outbound Campaigns MVP

GitHub: https://github.com/FALAK097/widget/issues/33

Assignee: `nikamritessh`

Priority: P2.

Dependencies:

- #29
- #39

Plan:

- Add campaign schema and audience filters.
- Support simple targeted widget messages first.
- Track campaign impressions/clicks/conversions.
- Use customer profile segments and events.
- Keep delivery async and idempotent.

### #38 Billing, Usage Limits, and Plan Gates

GitHub: https://github.com/FALAK097/widget/issues/38

Assignee: `FALAK097`

Priority: P1.

Dependencies:

- #44

Plan:

- Add usage meter and plan limit schema.
- Count messages, AI tokens, seats, sources, storage, sync runs, and tool actions.
- Add server-side gates before expensive work.
- Add dashboard usage page.
- Do not rely on client-side gating.

## Ownership Guidance

Current GitHub assignments imply this split:

| Owner          | Best-fit work                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FALAK097`     | Cloudflare platform, queues/workflows, Durable Objects, AI telemetry/evals, Composio/tool execution, developer APIs, billing gates                               |
| `nikamritessh` | Dashboard UI, chat polish, TanStack Form pattern, tickets UI, customer profiles, booking workflow UI, integration health UI, optimization center, product ops UI |

When work crosses the boundary:

- Backend contract owner should land typed API/schema first.
- UI owner should avoid changing backend internals unless the contract is already merged.
- If a UI issue is blocked by backend, use typed mock adapters only when the GitHub issue explicitly allows it, such as #46.

## PR Expectations

Each PR should include:

- GitHub issue link.
- Summary of user-visible behavior.
- Schema/migration notes if applicable.
- Manual smoke steps.
- Verification command output summary.
- Screenshots or short screen recording for UI-heavy work.
- Explicit note about workspace scoping and idempotency when relevant.

PR body template:

```md
## Summary

- ...

## Issue

Closes #...

## Schema / Migration

- ...

## Workspace / Security Notes

- ...

## Manual Smoke

- ...

## Verification

- [ ] pnpm fmt
- [ ] pnpm lint
- [ ] pnpm typecheck
- [ ] SKIP_ENV_VALIDATION=1 pnpm build
```

## Things To Avoid

- Do not create a separate `Message` table.
- Do not store authorized domains in a separate relation.
- Do not bypass `requireDashboardContext` or equivalent membership checks.
- Do not use module-level memory for queues, realtime rooms, approvals, or workflows.
- Do not add untyped JSON blobs without parse/stringify helpers and Zod schemas.
- Do not add side-effecting AI tools without approval policy and audit persistence.
- Do not let UI-only gates protect paid or expensive server operations.
- Do not replace existing working surfaces with broad rewrites unless the issue requires it.

## Quick Start For A Teammate

1. Pick the next issue from the recommended build order.
2. Read the GitHub issue and this document section.
3. Inspect the files listed for that issue.
4. Confirm whether the current code already partially implements the issue.
5. Implement as a vertical slice.
6. Run verification.
7. Open PR with the issue link and smoke steps.
