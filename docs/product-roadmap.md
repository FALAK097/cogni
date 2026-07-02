# widget Product Roadmap

Last updated: 2026-07-02

## Goal

Build widget into an AI-first customer support platform comparable to Intercom, Chatbase, Chatwoot, Cossistant, and Productlane: embedded support widget, human inbox, AI agent, knowledge base, app actions, tickets, customer intelligence, analytics, proactive messaging, feedback, roadmap, changelog, and Cloudflare-native durable execution.

## Current Product State

### Already Implemented

- Marketing site with hero, features, integrations, pricing, FAQ, testimonials, legal pages, and contact form.
- Google OAuth via Better Auth, workspace provisioning, workspace switching, workspace invites, member roles.
- Dashboard shell with sidebar/topbar, theme support, session guard, workspace switcher.
- Embedded widget loader under `public/widget.js` and widget modules for UI, state, API, storage, lead capture, feedback, documents.
- Widget customization for branding, colors, sizing, typography, position, launcher, preview messages, suggestions, privacy link, lead capture, brochure prompt, model provider/name, AI instructions, escalation keywords, authorized domains.
- Public widget APIs for config, session, sessions, identify, history, message, chat streaming, feedback, upload, documents, lead capture detection/submission.
- Conversation schema with JSON message history, visitor sessions, contacts, attachments, assignment, `aiPaused`, status, visitor metadata.
- Dashboard conversations page with filters for all/unassigned/mine/open/closed, conversation detail panel, contact/conversation details panel, unread count adjustment.
- AI widget agent using Vercel AI SDK `streamText`, OpenAI/Gemini providers, retrieved knowledge, memory context hook, citations, token reporting, handoff message streaming.
- Knowledge base manager with manual text, URL, sitemap, file upload, source table, sorting, deletion, status badges, chunk counts.
- Knowledge processing for extraction, chunking, retrieval, Cloudflare AI Search integration, local fallback paths.
- R2-backed upload storage with local fallback.
- Dashboard analytics for conversations, unique users, resolved conversations, response time, satisfaction, engagement, source/status breakdowns, top questions, time series.
- Integrations catalog for Gmail, Google Calendar, Slack with manifests, placeholder OAuth status/actions, integration action records.
- Domain events, notifications, and local workflow run records.
- Cloudflare deployment config with Workers, D1, R2, AI Search, OpenNext, observability.

### Current Gaps

- No ticket object. Conversations have status, but no ticket lifecycle, priority, SLA, due date, comments, linked issues, or customer-visible ticket tracking.
- No realtime presence or live inbox transport. Conversation UI depends on polling/query refresh, not Durable Objects/WebSocket/SSE presence.
- AI actions are registry placeholders. No Composio connection model, OAuth token vault, tool execution approval UX, action audit detail, or retry queue.
- No Cloudflare Queues, Workflows, or Durable Objects bindings in `wrangler.jsonc`.
- No email channel. Cloudflare Email Sending is not wired to inbound/outbound support threads.
- No omnichannel adapters for Slack, Teams, WhatsApp, Discord, Google Chat, or email via Chat SDK.
- No agent copilot in inbox. AI only replies to visitor widget, not human agent drafting, summarization, suggested replies, or macro application.
- No AI quality layer. Missing evaluation sets, hallucination checks, source coverage, deflection rate, QA scoring, sentiment/topic classification, or monitoring alerts.
- Knowledge base lacks recurring sync, connector sources, Q&A pairs, versioning, access control, crawl scheduling, and source health.
- Customer intelligence exists as `contact` plus notes but lacks companies/accounts, segments, custom attributes, events, timeline, tags UI, lead scoring, or enrichment.
- Lead management is schema/API-level only. Missing dashboard lead list, qualification pipeline, assignment rules, lifecycle states, and CRM sync.
- No proactive outbound messaging, product tours, banners, checklists, campaigns, or audience targeting.
- No Productlane-style feedback, public roadmap, changelog, feature requests, votes, linking feedback to conversations/customers.
- No admin reporting builder, custom dashboards, cohorts, funnel metrics, saved filters, exports, or alerting.
- No billing/plans/usage enforcement UI despite `plan-limits`.
- No API keys, webhooks, public REST API, or developer docs for customer apps.
- UI polish gaps: chat message primitives are custom/public JS, not aligned with newer shadcn message, bubble, attachment, scrollbar, marker components; dashboard tables/forms are mixed with React Hook Form instead of TanStack Form.
- Test coverage is unclear from package scripts; no visible unit/e2e suite in scripts.

## Competitor Parity Targets

### Intercom-Level Helpdesk

- Omnichannel inbox covering widget, email, Slack/Teams, WhatsApp, social, and API-created conversations.
- AI agent plus human agent workspace sharing same customer record and full handoff context.
- Ticketing, routing, assignment, SLAs, priority, automations, macros, internal notes.
- Customer intelligence with people, companies, attributes, events, segments, and conversation history.
- Reporting, always-on QA, insights, topic trends, and support operations recommendations.

### Chatbase/Cossistant-Level AI Agent

- Agent builder with instructions, model routing, tools/actions, guardrails, test playground, deploy channels, and analytics.
- Train from docs, websites, files, FAQs, sitemap, Google Drive, Notion, GitHub, help center, and APIs.
- Human handoff and escalation rules.
- Agent optimization loop: unanswered questions, weak sources, failed actions, low confidence answers, feedback-driven improvements.

### Chatwoot-Level Open Support Suite

- Shared inbox, teams, assignment, labels, contact profile, canned responses, macros.
- Multi-channel support and app integrations.
- Agent availability, business hours, automations, webhooks, API.

### Productlane-Level Feedback + Roadmap

- Feedback capture from conversations, forms, and public portal.
- Feature requests, votes, linked customers, revenue/account impact, triage states.
- Roadmap boards and changelog publishing.
- Support conversation to feedback item conversion.

## Target Technical Direction

### App Stack

- Next.js 16 App Router, TypeScript, Zod, Tailwind v4, shadcn/ui.
- TanStack Query for all async dashboard state.
- TanStack Table for all data grids.
- TanStack Form for dashboard forms and validation, using Zod schemas.
- Zustand only for local UI state that must span sibling components.
- Vercel AI SDK current stable major. As of 2026-07-02, official docs show AI SDK v6 as latest, not v7.
- Chat SDK for platform-agnostic bots/adapters across Slack, Teams, Google Chat, Discord, WhatsApp, and similar channels.
- Streamdown for streaming markdown rendering in AI/chat surfaces.

### Cloudflare Platform

- Workers + OpenNext for app deployment.
- D1 for relational product data.
- R2 for attachments, uploads, transcripts, exports, generated artifacts.
- AI Search for retrieval indexes.
- Queues for async ingestion, webhooks, outbound notifications, AI eval jobs, retries.
- Workflows for durable long-running tasks like website crawls, connector sync, complex agent actions, and post-conversation processing.
- Durable Objects for realtime conversation room state, typing, presence, stream coordination, and per-conversation ordering.
- Email Sending for outbound email replies, notifications, invites, digests, and customer updates.

### Integration Platform

- Composio for external app connectors and tool execution where possible.
- Store integration connection state per workspace.
- Keep action audit logs in product DB.
- Execute side-effecting actions through queue/workflow with idempotency keys.
- Require human approval for dangerous actions until policy confidence exists.

## Milestones

### M0 - Foundation Hardening

- Add missing test scripts and coverage plan.
- Add Cloudflare Queues, Workflows, Durable Objects, Email Sending bindings.
- Add API error/result conventions, audit logging, and typed JSON helpers.
- Migrate chat markdown to Streamdown.
- Create TanStack Form pattern and gradually replace React Hook Form dashboard forms.

### M1 - Core Support Suite

- Ticket model and ticket-conversation bridge.
- Agent inbox upgrades: assignment, priority, notes, macros, status, search, saved views.
- Realtime conversation rooms with Durable Objects.
- Email channel with Cloudflare Email Sending.
- Customer/contact profiles with tags, notes, custom fields, events, timeline.

### M2 - AI Agent Platform

- Agent builder/playground with test conversations and deploy settings.
- Tool/action execution through Composio and internal tools.
- Agent copilot for summaries, drafts, suggested replies, next actions.
- AI eval/QA pipeline for answer quality, source use, sentiment, topics, deflection.
- Optimization dashboard for unanswered questions, bad feedback, missing docs.

### M3 - Knowledge + Integrations

- Scheduled source sync via Queues/Workflows.
- Google Drive, Notion, GitHub, help center, API connector sources.
- Source versioning, health, incremental indexing, and reindex controls.
- Integration marketplace with OAuth setup, connection health, permissions, and logs.

### M4 - Growth + Product Ops

- Lead dashboard, lead scoring, routing, CRM sync, lifecycle pipeline.
- Proactive campaigns: banners, messages, tours, checklists, audience targeting.
- Feedback portal, roadmap boards, votes, changelog.
- Billing/usage limits and team settings.

### M5 - Enterprise Readiness

- Roles/permissions beyond owner/member.
- SSO/SAML if Google-only auth rule changes.
- Audit logs, data export/delete, retention controls.
- Reliability dashboards, alerting, webhooks, public API keys.
- Security hardening, abuse/rate limiting, compliance docs.

## Roadmap Issues

| Issue                                            | Area         | Type | Related         |
| ------------------------------------------------ | ------------ | ---- | --------------- |
| Realtime conversation rooms with Durable Objects | Inbox        | AFK  | #5              |
| Ticket lifecycle MVP                             | Tickets      | AFK  | #8              |
| Agent inbox copilot                              | AI/Inboxes   | AFK  | #4              |
| Composio tool connections and action approvals   | Integrations | AFK  | #4              |
| Queue-backed async ingestion and retries         | Platform     | AFK  | #9              |
| Cloudflare Workflows for durable source sync     | Platform     | AFK  | #9              |
| Cloudflare Email Sending channel                 | Omnichannel  | AFK  | #7              |
| Chat SDK adapter foundation                      | Omnichannel  | HITL | #4              |
| Knowledge source health and scheduled sync       | Knowledge    | AFK  | #9              |
| Customer intelligence profiles                   | CRM          | AFK  | #1              |
| Lead qualification dashboard                     | Leads        | AFK  | #1              |
| AI evaluation and QA scoring                     | AI Ops       | AFK  | #4              |
| Unanswered questions optimization center         | AI Ops       | AFK  | #9              |
| Proactive outbound campaigns MVP                 | Growth       | HITL | #5              |
| Feedback portal and roadmap MVP                  | Product Ops  | HITL | none            |
| Changelog publishing                             | Product Ops  | AFK  | Feedback portal |
| Reporting builder and saved analytics views      | Analytics    | AFK  | none            |
| Integration marketplace with connection health   | Integrations | AFK  | #4              |
| Billing, usage limits, and plan gates            | Billing      | HITL | none            |
| Developer API keys and webhooks                  | Platform     | AFK  | none            |
| Chat UI component polish pass                    | UI           | AFK  | #5              |
| TanStack Form migration pattern                  | UI/Infra     | AFK  | none            |
| Streamdown migration for AI markdown             | UI/AI        | AFK  | #5              |
| Test coverage foundation                         | Quality      | AFK  | none            |

## Detailed Issue Backlog

### 1. Realtime Conversation Rooms With Durable Objects

Build per-conversation room coordination so visitor widget and dashboard agents see new messages, typing, read state, and AI stream progress without manual refresh.

Acceptance:

- Durable Object namespace exists in config with local/dev fallback.
- Widget and dashboard subscribe to same conversation room.
- Message ordering and duplicate client message IDs stay idempotent.
- Typing/read events do not persist as messages.
- Basic fallback works when realtime connection unavailable.

### 2. Ticket Lifecycle MVP

Add first-class tickets linked to conversations and contacts so support teams can track work beyond chat status.

Acceptance:

- Ticket schema supports title, status, priority, assignee, due date, source conversation, contact, workspace.
- Agents can create ticket from conversation, update status/priority/assignee, and view linked ticket context.
- Customer-visible ticket reference can be sent in widget/email.
- Existing conversation status remains compatible.

### 3. Agent Inbox Copilot

Add AI assistance for human agents inside dashboard conversations.

Acceptance:

- Agent can generate summary, draft reply, and suggested next action from conversation detail.
- Drafts never send automatically.
- Suggestions cite used KB sources/actions where relevant.
- Copilot usage is logged with workspace/conversation IDs.

### 4. Composio Tool Connections And Action Approvals

Turn integration action placeholders into real workspace app actions using Composio.

Acceptance:

- Workspace can connect at least one Composio-backed app.
- Connected tools appear in agent/action registry with typed Zod inputs.
- AI-proposed side effects require agent approval.
- Approved action runs with idempotency key and stores result/error.

### 5. Queue-Backed Async Ingestion And Retries

Move document ingestion and long-running jobs off request lifecycle.

Acceptance:

- Cloudflare Queue binding exists for ingestion jobs.
- Upload/URL/sitemap requests enqueue work and return processing status.
- Worker consumer updates source status, chunks, search index, and failure reason.
- Retry/dead-letter behavior is visible in dashboard.

### 6. Cloudflare Workflows For Durable Source Sync

Use Workflows for multi-step crawls, connector sync, and action workflows.

Acceptance:

- Workflow binding exists in config.
- Source sync workflow records run state in `workflow_run`.
- Workflow supports resume/retry and idempotent source updates.
- Dashboard shows latest sync status and error.

### 7. Cloudflare Email Sending Channel

Add email as a support channel for outbound replies and notifications.

Acceptance:

- Email Sending binding and sender config exist.
- Agent can send email reply from conversation/ticket.
- Email replies create or update conversations.
- Email events are logged and scoped to workspace.

### 8. Chat SDK Adapter Foundation

Create platform-agnostic adapter layer for Slack/Teams/WhatsApp-like channels.

Acceptance:

- Chat SDK is integrated behind a `channel_adapter` boundary.
- One non-widget channel can receive inbound event and create conversation.
- Outbound reply path reuses conversation service.
- Adapter auth/config is per workspace.

### 9. Knowledge Source Health And Scheduled Sync

Upgrade KB from static sources to monitored, refreshable sources.

Acceptance:

- Sources track last sync, next sync, sync interval, health, content hash, and error.
- User can re-sync source manually.
- Scheduled sync enqueues work.
- Changed content creates new chunks and updates retrieval index.

### 10. Customer Intelligence Profiles

Build full customer record for support context.

Acceptance:

- Contact profile shows identity, tags, notes, sessions, conversations, tickets, leads, attributes, timeline.
- Agents can edit tags/custom fields.
- Widget identify API updates profile safely.
- All reads/writes enforce workspace membership.

### 11. Lead Qualification Dashboard

Turn captured leads into manageable pipeline.

Acceptance:

- Lead list/table supports filters, status, score, owner, source, created date.
- Lead detail links contact, conversation, captured chat summary.
- Qualification rules compute initial score/category.
- Assignment and notification path exists.

### 12. AI Evaluation And QA Scoring

Score AI and human support interactions for quality.

Acceptance:

- Post-conversation job scores answer helpfulness, source grounding, sentiment, escalation appropriateness.
- Dashboard shows QA score and failure reasons.
- Low-score conversations create notification/recommendation.
- Scores are reproducible enough for tests with mocked model output.

### 13. Unanswered Questions Optimization Center

Expose knowledge gaps and AI improvement tasks.

Acceptance:

- Dashboard lists unanswered/low-confidence questions and negative feedback.
- Each gap links to source conversation and suggested KB fix.
- User can create manual KB snippet or mark as ignored.
- Metrics show gap trend over time.

### 14. Proactive Outbound Campaigns MVP

Add targeted in-product messages for activation/support.

Acceptance:

- Campaign schema supports audience, trigger, message, status, schedule.
- Widget can receive and render targeted banner/message.
- Dashboard can create draft campaign and preview it.
- Events track delivered/opened/clicked/dismissed.

### 15. Feedback Portal And Roadmap MVP

Add Productlane-style feedback collection and roadmap.

Acceptance:

- Feedback item schema supports title, body, status, customer, workspace, votes.
- Agents can convert conversation message into feedback item.
- Public portal lists planned/in-progress/shipped items.
- Customers can vote or submit feedback with identity guardrails.

### 16. Changelog Publishing

Publish shipped updates from roadmap/feedback workflow.

Acceptance:

- Changelog entry schema supports title, content, tags, publish status/date.
- Dashboard can draft/publish entry.
- Public changelog route renders entries.
- Linked feedback voters can be notified.

### 17. Reporting Builder And Saved Analytics Views

Move from fixed analytics to customizable operations reporting.

Acceptance:

- User can save analytics view with filters/date range/chart type.
- Report builder supports conversation, ticket, AI, satisfaction, source dimensions.
- Saved views are workspace-scoped.
- CSV export exists.

### 18. Integration Marketplace With Connection Health

Make integrations production-manageable.

Acceptance:

- Integration detail shows status, auth scope, last sync/action, errors, disconnect.
- Connection health check runs per provider.
- Action logs are searchable by provider/status.
- UI distinguishes configured, connected, errored, disabled.

### 19. Billing, Usage Limits, And Plan Gates

Add plan enforcement for $5 Workers-plan-friendly launch.

Acceptance:

- Usage counters cover messages, AI tokens, seats, storage, source syncs, actions.
- Plan limits are checked server-side.
- Dashboard shows current usage and upgrade/limit state.
- Limit errors are user-readable and logged.

### 20. Developer API Keys And Webhooks

Add programmable surface for customer apps.

Acceptance:

- Workspace admins can create/revoke API keys.
- Webhook endpoints can subscribe to conversation/ticket/lead/feedback events.
- Delivery uses queue with retries and signing secret.
- API key access is scoped and audited.

### 21. Chat UI Component Polish Pass

Modernize dashboard/widget chat UI with shadcn message primitives.

Acceptance:

- Message, bubble, attachment, scrollbar, marker/read-state primitives exist or are adopted.
- Widget and dashboard share consistent message rendering where feasible.
- Attachments, feedback, source citations, typing, and streaming states render cleanly on mobile/desktop.
- Accessibility labels and keyboard focus are verified.

### 22. TanStack Form Migration Pattern

Standardize complex dashboard forms on TanStack Form.

Acceptance:

- Shared form adapter pattern exists with Zod validation.
- One high-value form is migrated.
- Error display, pending state, reset, and optimistic update patterns are documented.
- React Hook Form remains only where intentionally deferred.

### 23. Streamdown Migration For AI Markdown

Use Streamdown for streamed AI markdown in widget/dashboard surfaces.

Acceptance:

- Streamdown renders AI responses with safe links and GFM.
- Streaming partial markdown does not break layout.
- Code blocks, lists, citations, and attachments are styled.
- XSS/link safety behavior is covered by tests.

### 24. Test Coverage Foundation

Add reliable checks before larger product expansion.

Acceptance:

- Unit/integration test runner exists in scripts.
- Conversation service, domain validation, KB chunk/retrieval helpers, and API auth guards have tests.
- Minimal Playwright smoke covers sign-in guard, widget config, conversations empty state, KB page.
- CI runs lint, typecheck, format check, tests, and build.

## References

- Intercom: https://www.intercom.com/
- Chatbase: https://www.chatbase.co/
- Chatwoot: https://www.chatwoot.com/
- Cossistant: https://cossistant.com/
- Productlane: https://productlane.com/
- Vercel AI SDK docs: https://ai-sdk.dev/docs
- Chat SDK: https://chat-sdk.dev/
- Streamdown: https://streamdown.ai/
- Cloudflare Queues: https://developers.cloudflare.com/queues/
- Cloudflare Workflows: https://developers.cloudflare.com/workflows/
- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/
- Cloudflare Email Sending Workers API: https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- Composio: https://composio.dev/
