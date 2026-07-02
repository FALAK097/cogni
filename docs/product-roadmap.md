# widget Product Roadmap

Last updated: 2026-07-02

## North Star

Build widget into an AI-first customer support and product feedback suite for SaaS teams:

- Intercom-style helpdesk: shared inbox, AI agent, tickets, SLAs, customer profiles, automations, reporting.
- Chatbase/Cossistant-style AI agent builder: knowledge ingestion, actions, guardrails, playground, deployment channels, analytics.
- Chatwoot-style open support suite: multi-channel inbox, teams, labels, macros, APIs, webhooks.
- Productlane-style product ops: feedback capture, feature requests, votes, roadmap, changelog.

The first sellable product should not try to equal every competitor at once. It should ship a tight wedge:

1. Embedded AI widget answers from knowledge.
2. Human team takes over in shared inbox.
3. Leads/customers/tickets stay tracked.
4. Knowledge gaps and bad answers become improvement tasks.
5. Integrations/actions turn conversations into outcomes.

## Source Findings

### Current Codebase Snapshot

Implemented today:

- Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/base-ui components.
- Better Auth with Google OAuth, workspace provisioning, members, invites, workspace switching.
- Dashboard shell: sidebar, topbar, workspace switcher, theme support, session guard.
- Marketing site: landing, pricing, integrations, testimonials, FAQ, footer, legal, contact.
- Embedded widget runtime in `public/widget.js` and modular files under `public/widget/`.
- Widget settings: branding, colors, typography, dimensions, position, suggestions, preview messages, lead capture, brochure prompt, model provider/name, instructions, escalation keywords, domains.
- Public widget APIs: config, session/bootstrap, identify, history, message/chat, feedback, upload, documents, lead capture.
- Conversation persistence using JSON message arrays per project invariant.
- Visitor sessions with browser/session identity, metadata, location fields, contact links.
- Attachments linked to conversation.
- Dashboard conversation list/detail with polling, filters, assignment, reply, internal notes, read state.
- Contact notes and previous conversation context in conversation detail.
- AI widget agent using Vercel AI SDK `streamText`, retrieved knowledge, memory context hook, citations, token capture.
- Knowledge manager with manual text, URL, sitemap, upload, table sorting, deletion, chunk counts, statuses.
- Knowledge extraction/chunking/retrieval, Cloudflare AI Search integration, local fallbacks.
- R2 upload storage with local fallback.
- Dashboard analytics: conversations, users, resolved, response time, satisfaction, engagement, sources, status, top questions, time series.
- Integrations catalog for Gmail, Google Calendar, Slack with placeholder connection/actions.
- Domain events, notifications, local workflow run records, integration action records.
- Cloudflare Workers deployment config with D1, R2, AI Search, OpenNext, observability.
- CI checks lint, typecheck, format on PR. React Doctor runs on PR and main.

Major gaps:

- No first-class tickets, priorities, SLAs, due dates, queue views, macros, saved views, labels, or business hours.
- No realtime inbox transport. Dashboard relies on TanStack Query polling.
- No Durable Objects, Queues, Workflows, or Email Sending bindings yet.
- No true email/Slack/WhatsApp/Teams channels, only widget channel plus placeholder integrations.
- No Composio connection model, tool auth, tool approvals, action run UI, or retry/approval workflow.
- No agent copilot for human support reps.
- No AI SDK 7 migration, `ToolLoopAgent`, tool context, runtime context, approvals, `WorkflowAgent`, timeouts, telemetry callbacks, or performance stats.
- No Streamdown markdown rendering.
- No AI QA/eval layer: answer scoring, grounding checks, hallucination detection, sentiment/topics, deflection metrics, low-quality alerts.
- Knowledge has static ingestion but lacks scheduled sync, connector sources, versioning, Q&A pairs, source health, incremental reindex.
- Customer model is contact-only. Missing companies/accounts, custom attributes, events, segments, timeline, lead score, enrichment.
- Lead schema exists but no lead dashboard/pipeline/routing/scoring UI.
- No proactive campaigns: banners, targeted messages, tours, checklists, sequences.
- No feedback/roadmap/changelog module.
- No billing, usage counters, plan gates, or upgrade flows.
- No developer API keys, webhooks, or public API docs.
- No app tests in scripts beyond lint/type/format.

## Correct AI SDK 7 Direction

Previous version of this document incorrectly said official docs showed v6 as latest. That was based on `ai-sdk.dev/docs` navigation still showing v6 on 2026-07-02. Vercel's AI SDK 7 announcement was published on 2026-06-25 and explicitly says AI SDK 7 is available.

Product implications:

- Upgrade package target from `ai@6.x` to `ai@7.x`.
- Run codemod during implementation: `npx @ai-sdk/codemod v7`.
- Use AI SDK 7 reasoning controls for model policy by task type:
  - low reasoning: greeting, simple FAQ, rewrite, summarization.
  - medium reasoning: support troubleshooting, KB synthesis, lead qualification.
  - high reasoning: multi-step account actions, complex ticket triage, workflow planning.
- Use typed tool context for Composio and internal tools so tool secrets/config are scoped per tool, not exposed globally.
- Use runtime context for workspace, conversation, contact, plan, approval policy, locale, channel, and current agent mode.
- Use tool approvals for side effects: email send, CRM update, calendar booking, ticket mutation, Slack/WhatsApp send, refund/coupon/admin actions.
- Use HMAC-signed approval continuation for high-risk actions.
- Use `WorkflowAgent` or equivalent AI SDK 7 workflow support for long-running runs that wait for approvals or survive deploys.
- Use timeout controls for total run, step, chunk, and tool budgets.
- Capture lifecycle events and performance statistics for billing, debugging, QA, and customer-facing reliability metrics.
- Consider provider file uploads for large attachments and uploaded docs where provider-native file reference improves repeated inference.
- Consider MCP Apps later for rich tool configuration/approval UIs, not M0.
- Voice/video generation are future optional channels, not part of MVP.

## Product Shape

### Primary Users

- Founder/operator: wants AI support installed fast, fewer repetitive questions, lead capture, simple analytics.
- Support teammate: wants a clean inbox, context, assignment, macros, AI drafts, tickets, customer history.
- Product teammate: wants feedback linked to customers, votes, roadmap, changelog.
- Developer/admin: wants integration setup, domains, API keys, webhooks, deployment reliability.

### Core Objects

Already present:

- `workspace`, `workspace_member`, `workspace_invite`
- `user`, `session`, `account`, `verification`
- `widget`
- `visitor_session`
- `contact`, `contact_note`
- `conversation` with JSON `messages`
- `attachment`
- `document`, `document_chunk`
- `lead`, `widget_lead_capture`
- `integration`, `integration_action`
- `notification`, `domain_event`, `workflow_run`

Needed soon:

- `ticket`: title, number, status, priority, type, source, assignee, due date, SLA timestamps, workspace, contact, conversation.
- `conversation_label` or JSON labels if kept simple.
- `macro`: saved replies/actions scoped by workspace/team.
- `customer_event`: tracked app/page/action events.
- `company`: account/org profile for contacts.
- `segment`: saved audience filters.
- `knowledge_source_sync`: runs, hashes, health, scheduling, stats.
- `agent_run`: AI SDK 7 run metadata, lifecycle, usage, performance, status.
- `agent_tool_call`: tool input/result/approval/audit.
- `approval_request`: human approval state for side-effecting actions.
- `channel_connection`: Chat SDK/Composio/email channel credentials/config state.
- `email_message`: provider IDs, headers, threading metadata.
- `feedback_item`, `feedback_vote`, `roadmap_item`, `changelog_entry`.
- `campaign`, `campaign_audience`, `campaign_event`.
- `api_key`, `webhook_endpoint`, `webhook_delivery`.
- `usage_meter`, `billing_plan`, `plan_limit`.

Keep project invariants:

- `Conversation.messages` remains JSON array. Do not create `Message` table unless invariant changes.
- `Widget.authorizedDomains` remains JSON string array.
- `Attachment` links directly to `Conversation`.
- Every query stays workspace-scoped and membership-checked.

## Technical Operating Model

### Next.js App

- Route handlers for public widget, dashboard API, webhooks, and channel callbacks.
- Server actions only where existing UI patterns expect them; dashboard data should mostly use typed route handlers with TanStack Query.
- Shared domain logic in `src/features/*/server` modules.
- Zod schemas at API boundaries and form boundaries.
- No in-memory state for production-critical behavior.

### Client State

- TanStack Query: dashboard reads/writes, cache invalidation, polling fallback.
- TanStack Table: all heavy tables: conversations, tickets, leads, KB sources, integrations, feedback, analytics exports, logs.
- TanStack Form: all non-trivial dashboard forms going forward.
- Zustand: local panel/UI state only, not server truth.

### Cloudflare

- D1: product DB and audit records.
- R2: uploads, attachments, transcripts, exports, large crawl artifacts.
- AI Search: retrieval index.
- Queues:
  - `ingestion-jobs`: URL/file/sitemap/source sync.
  - `ai-eval-jobs`: QA scoring, topic/sentiment extraction.
  - `notification-jobs`: Slack/email/in-app notification fanout.
  - `webhook-deliveries`: webhook retries.
  - `action-jobs`: side-effecting integration actions.
- Workflows:
  - source crawl and sync workflow.
  - approved AI action workflow.
  - post-conversation processing workflow.
  - campaign delivery workflow.
- Durable Objects:
  - per-conversation realtime room.
  - typing/read/presence state.
  - AI stream coordination.
  - ordering/dedupe guard for concurrent widget/dashboard sends.
- Email Sending:
  - outbound support replies.
  - invite/notification/digest emails.
  - roadmap/changelog notifications.

### AI Runtime

- AI SDK 7 is target runtime.
- `streamWidgetAgent` evolves into agent layer:
  - shared agent config.
  - typed runtime context.
  - tool registry.
  - approval policy.
  - per-channel response adapters.
  - lifecycle telemetry.
  - timeouts and cost guards.
- Streamdown renders AI markdown in widget/dashboard.
- Agent eval jobs score all important conversations.
- Agent run data powers cost, latency, deflection, quality, and audit views.

### Integrations

- Composio handles external connectors/actions where supported.
- Chat SDK handles chat platform adapters where relevant.
- Internal action registry remains for first-party operations: assign conversation, create ticket, add note, create lead, update contact, create feedback, send email.
- Every side-effecting action must have:
  - Zod input schema.
  - workspace-scoped context.
  - idempotency key.
  - approval policy.
  - audit row.
  - retry/dead-letter strategy if async.

## Build Order

### Phase M0 - Foundation Hardening

Goal: create rails so teammates/agents can build safely without breaking architecture.

Order:

1. Test coverage foundation.
2. AI SDK 7 migration and agent telemetry.
3. Streamdown migration for AI markdown.
4. TanStack Form migration pattern.
5. Cloudflare platform bindings: Queues, Workflows, Durable Objects, Email Sending.
6. Queue-backed async ingestion and retries.
7. Cloudflare Workflows for durable source sync.

Why first:

- Tests prevent regressions while schema/API surface expands.
- AI SDK 7 changes affect agent/tool design, so do before Composio/copilot.
- Cloudflare bindings define how realtime, ingestion, email, actions, evals work.

### Phase M1 - Core Support Suite

Goal: make product usable by support team daily.

Order:

1. Realtime conversation rooms with Durable Objects.
2. Chat UI component polish pass.
3. Ticket lifecycle MVP.
4. Customer intelligence profiles.
5. Cloudflare Email Sending channel.
6. Reporting builder and saved analytics views.

Why:

- Realtime + polished chat improves current core UX.
- Tickets/customer profiles turn conversations into tracked support work.
- Email expands beyond widget.

### Phase M2 - AI Agent Platform

Goal: AI becomes controllable, auditable, actionable.

Order:

1. Agent inbox copilot.
2. Composio tool connections and action approvals.
3. Integration marketplace with connection health.
4. AI evaluation and QA scoring.
5. Unanswered questions optimization center.

Why:

- Copilot gives immediate value without autonomous risk.
- Tool approvals enable safe actions.
- Eval/optimization turns support data into product quality loop.

### Phase M3 - Knowledge + Omnichannel

Goal: more sources and channels without losing reliability.

Order:

1. Knowledge source health and scheduled sync.
2. Chat SDK adapter foundation.
3. Developer API keys and webhooks.
4. Lead qualification dashboard.

Why:

- Better knowledge improves AI answer quality.
- Channel adapters should reuse mature conversation/ticket/customer systems.
- API/webhooks support customer integrations.

### Phase M4 - Growth + Product Ops

Goal: convert support into activation, feedback, roadmap.

Order:

1. Feedback portal and roadmap MVP.
2. Changelog publishing.
3. Proactive outbound campaigns MVP.
4. Billing, usage limits, and plan gates.

Why:

- Feedback/roadmap differentiates from plain chatbots.
- Campaigns need segments/events from customer intelligence.
- Billing should gate usage once product value paths exist.

### Phase M5 - Enterprise Later

Not immediate:

- Advanced roles/permissions.
- SSO/SAML unless Google-only rule changes.
- Data residency.
- Retention policies.
- Audit export.
- SOC2 evidence automation.
- Voice/video support.
- MCP App UIs.

## Prioritized Issue Plan

| Order | Issue                                                | Phase | Priority | Size | Estimate | Status  | Depends on |
| ----- | ---------------------------------------------------- | ----- | -------- | ---- | -------- | ------- | ---------- |
| 1     | #43 Test coverage foundation                         | M0    | P0       | L    | 8        | Ready   | none       |
| 2     | #44 AI SDK 7 migration and agent telemetry           | M0    | P0       | L    | 8        | Ready   | #43        |
| 3     | #42 Streamdown migration for AI markdown             | M0    | P0       | M    | 5        | Ready   | #43        |
| 4     | #41 TanStack Form migration pattern                  | M0    | P1       | M    | 5        | Ready   | #43        |
| 5     | #24 Queue-backed async ingestion and retries         | M0    | P0       | L    | 8        | Ready   | #43        |
| 6     | #25 Cloudflare Workflows for durable source sync     | M0    | P0       | L    | 8        | Ready   | #24        |
| 7     | #20 Realtime conversation rooms with Durable Objects | M1    | P0       | XL   | 13       | Backlog | #43        |
| 8     | #40 Chat UI component polish pass                    | M1    | P1       | M    | 5        | Backlog | #42        |
| 9     | #21 Ticket lifecycle MVP                             | M1    | P0       | L    | 8        | Backlog | #43        |
| 10    | #29 Customer intelligence profiles                   | M1    | P0       | L    | 8        | Backlog | #21        |
| 11    | #26 Cloudflare Email Sending channel                 | M1    | P1       | L    | 8        | Backlog | #21        |
| 12    | #36 Reporting builder and saved analytics views      | M1    | P2       | M    | 5        | Backlog | #21        |
| 13    | #22 Agent inbox copilot                              | M2    | P0       | L    | 8        | Backlog | #44        |
| 14    | #23 Composio tool connections and action approvals   | M2    | P0       | XL   | 13       | Backlog | #44        |
| 15    | #37 Integration marketplace with connection health   | M2    | P1       | M    | 5        | Backlog | #23        |
| 16    | #31 AI evaluation and QA scoring                     | M2    | P0       | L    | 8        | Backlog | #44        |
| 17    | #32 Unanswered questions optimization center         | M2    | P1       | M    | 5        | Backlog | #31        |
| 18    | #28 Knowledge source health and scheduled sync       | M3    | P1       | L    | 8        | Backlog | #25        |
| 19    | #27 Chat SDK adapter foundation                      | M3    | P1       | XL   | 13       | Backlog | #21, #23   |
| 20    | #39 Developer API keys and webhooks                  | M3    | P1       | L    | 8        | Backlog | #24        |
| 21    | #30 Lead qualification dashboard                     | M3    | P1       | M    | 5        | Backlog | #29        |
| 22    | #34 Feedback portal and roadmap MVP                  | M4    | P1       | XL   | 13       | Backlog | #29        |
| 23    | #35 Changelog publishing                             | M4    | P2       | M    | 5        | Backlog | #34        |
| 24    | #33 Proactive outbound campaigns MVP                 | M4    | P2       | XL   | 13       | Backlog | #29, #39   |
| 25    | #38 Billing, usage limits, and plan gates            | M4    | P1       | L    | 8        | Backlog | #44        |

Note: issue #44 should be created for AI SDK 7 migration because it is now a distinct blocker.

## Feature Detail

### 1. AI Widget + Agent Builder

MVP:

- Current widget settings continue.
- Add agent playground with test conversation, selected sources, model, reasoning mode, and output preview.
- Add AI SDK 7 runtime context:
  - `workspaceId`
  - `widgetId`
  - `conversationId`
  - `contactId`
  - `channel`
  - `plan`
  - `locale`
  - `approvalPolicy`
- Store `agent_run` rows with model, provider, reasoning, tokens, latency, timeouts, finish reason, error, tool count.
- Support per-agent instructions, tone, escalation rules, tool enablement, source filters.

Later:

- Multiple agents per workspace.
- A/B model evaluation.
- Voice agent.
- MCP App UI.

### 2. Shared Inbox

MVP:

- Realtime room per conversation.
- Assignment, status, labels, internal notes, public replies.
- Saved views: Mine, Unassigned, Open, Snoozed, Waiting, Closed.
- Macros with text and optional actions.
- Read state and typing indicators.
- Customer side receives human replies in widget/email.

Later:

- Collision detection, agent presence, workload balancing.
- Team routing and business hours.

### 3. Ticketing

MVP:

- Ticket created from conversation or manually from contact.
- Status: open, pending, waiting_on_customer, resolved, closed.
- Priority: low, normal, high, urgent.
- Type: question, bug, task, feature_request, billing, incident.
- SLA target timestamps: first response, next response, resolution.
- Linked conversation, contact, assignee.

Later:

- Custom fields.
- Forms.
- Customer portal ticket tracking.
- Incident grouping.

### 4. Knowledge

MVP:

- Existing manual URL/file/sitemap stays.
- Move ingestion to queue.
- Add source health:
  - last sync
  - next sync
  - interval
  - content hash
  - chunk count
  - error
  - retrieval coverage
- Add re-sync button and scheduled sync.
- Add Q&A source type.
- Add unanswered questions -> source gap flow.

Later:

- Notion, Google Drive, GitHub, Help Center, API docs connectors.
- ACL-aware retrieval.
- Version diff.

### 5. Integrations + Actions

MVP:

- Composio connection for first external app.
- Internal tools:
  - create ticket
  - assign conversation
  - add internal note
  - create/update lead
  - update contact
  - send email
- External tools:
  - Gmail/send email or Cloudflare Email send path.
  - Google Calendar/create meeting.
  - Slack notify.
- AI SDK 7 tool approvals for side effects.
- Action run details: input, approval, status, result, error, retry.

Later:

- CRM sync, Stripe lookup, Linear/Jira issue creation, WhatsApp follow-up.

### 6. Omnichannel

MVP:

- Email channel using Cloudflare Email Sending.
- Chat SDK adapter boundary for future Slack/Teams/WhatsApp.
- Single conversation service normalizes inbound events.

Later:

- WhatsApp lead follow-up.
- Slack/Teams agent.
- Social DMs.

### 7. Customer Intelligence + Leads

MVP:

- Contact profile with tags, custom fields, notes, sessions, conversations, tickets, leads.
- Lead list/table with status, score, owner, source, last activity.
- Qualification rules from conversation and form data.
- Notifications on high-score lead.

Later:

- Companies/accounts.
- Segments.
- Revenue/account impact.
- Enrichment.

### 8. AI QA + Optimization

MVP:

- Post-conversation queue job scores:
  - helpfulness
  - source grounding
  - escalation appropriateness
  - sentiment
  - topic
  - deflection
- Bad feedback and low confidence become improvement tasks.
- Dashboard shows unanswered questions and suggested KB fixes.

Later:

- Custom QA rubrics.
- Agent coaching.
- Automated experiments.

### 9. Feedback + Roadmap + Changelog

MVP:

- Convert conversation message into feedback item.
- Public portal with planned/in-progress/shipped.
- Voting with identity guardrails.
- Changelog entries linked to roadmap items.

Later:

- Revenue-weighted prioritization.
- Customer notifications.
- Private roadmap boards.

### 10. Billing + Usage

MVP:

- Counters:
  - messages
  - AI tokens
  - seats
  - sources
  - storage
  - sync runs
  - tool actions
- Server-side plan gates before expensive work.
- Dashboard usage page.

Later:

- Stripe subscription, invoices, trial, metered billing.

## Agent Instructions For Future Work

Every issue should be implemented as a vertical slice:

- Schema/migration if needed.
- Server/domain logic.
- Route handler/API.
- Dashboard/widget UI.
- Query hooks/cache invalidation.
- Tests.
- Docs or comments only where useful.

Rules:

- Keep DB queries workspace-scoped.
- Use Zod at input boundaries.
- No `any`.
- No production-critical in-memory state.
- Keep `Conversation.messages` JSON invariant.
- Use existing `src/features/*` ownership boundaries.
- Use TanStack Query/Table/Form patterns.
- For Cloudflare jobs/actions, use idempotency keys.
- For side-effecting AI tools, require approval until policy explicitly says safe.
- Log domain events for support-relevant mutations.
- Add project issue references in PR description.

## References

- Intercom: https://www.intercom.com/
- Chatbase: https://www.chatbase.co/
- Chatwoot: https://www.chatwoot.com/
- Cossistant: https://cossistant.com/
- Productlane: https://productlane.com/
- AI SDK 7 announcement: https://vercel.com/blog/ai-sdk-7
- Vercel AI SDK docs: https://ai-sdk.dev/docs
- Chat SDK: https://chat-sdk.dev/
- Streamdown: https://streamdown.ai/
- Cloudflare Queues: https://developers.cloudflare.com/queues/
- Cloudflare Workflows: https://developers.cloudflare.com/workflows/
- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/
- Cloudflare Email Sending Workers API: https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- Composio: https://composio.dev/
