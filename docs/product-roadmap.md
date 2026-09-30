# Cogni product roadmap

Updated: 2026-09-29. Target: **AI agent + shared support inbox**, confirmed by the owner.

This replaces the July architecture/status snapshot. Implementation evidence is the local branch
`agent/omnichannel-agent-platform`, commit `92089bff194a76970c5d3abc8e053792fcb61f75`, and
[PR #48](https://github.com/FALAK097/cogni/pull/48). Code present is not evidence that provider
setup, deployed behavior, concurrency safety, or customer acceptance is complete.

## Product promise

A business imports its knowledge, tests an AI support agent, installs a branded widget, and
handles exceptions in a shared inbox. Every unsuccessful answer becomes a specific knowledge,
policy, or integration improvement. One customer record and conversation history span AI and
human support.

Start with small SaaS support teams. The first sellable release must complete this journey:

1. Sign in with Google and select a workspace.
2. Import sources and understand whether each is ready or needs intervention.
3. Configure instructions and handoff; test answers with visible source evidence.
4. Authorize a website and install the loader.
5. A visitor asks a question, receives a grounded answer, or requests a human.
6. A teammate takes over, replies, and closes the conversation without competing AI replies.
7. Review feedback, cost, unresolved questions, and the next source improvement.

Use competitor interaction patterns and information architecture with Cogni's components and
branding. Pixel parity with private competitor dashboards has not been established. Screenshots
of public product illustrations are references, not executable proof of a complete application.

## Reference evidence

Inspected public pages and navigation on 2026-09-29:

| Reference                                                          | What informs Cogni                                                                  | Evidence boundary                                                                         |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Chatbase](https://www.chatbase.co/)                               | Build, test, deploy, optimize lifecycle; clear agent setup and product navigation   | Homepage browser screenshot and expanded Product menu                                     |
| [Chatbase helpdesk](https://www.chatbase.co/features/helpdesk)     | Separate live handoff from async tickets; statuses, assignment, notes, custom views | Public feature page, narrow-width screenshot; private dashboard not accessed              |
| [Chatbase procedures](https://www.chatbase.co/features/procedures) | Explicit multi-step business procedures with actions                                | Public feature description, not a workflow execution test                                 |
| [Intercom inbox](https://www.intercom.com/helpdesk/inbox)          | Team inbox, configurable panes, keyboard navigation, human copilot                  | Public feature page and homepage product illustrations                                    |
| [Fin](https://fin.ai/)                                             | Agent testing and continuous improvement, contextual actions, channel coverage      | Public capabilities/navigation; proprietary model performance is not a Cogni target claim |
| [Chatwoot](https://github.com/chatwoot/chatwoot)                   | Support operations: notes, labels, teams, saved views, macros, routing, reports     | Repository README and dashboard route directory inspected via GitHub API                  |
| [Chatwoot feature index](https://www.chatwoot.com/features)        | Breadth checklist for channels, productivity, customer data, reporting              | Public feature index; not a live signed-in workspace test                                 |

Competitor numbers, testimonials, customer logos, and compliance claims must not become Cogni
claims. Marketing should describe verified capability. Measure outcomes before publishing rates.

## Current implementation and parity gaps

| Area                         | Current evidence                                                                                                                                                                                                                                                                                                                             | Gap to a dependable product                                                                                                                                                                                        | Phase / existing issues                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Auth / workspace             | Better Auth Google, membership, invitations, active workspace context                                                                                                                                                                                                                                                                        | Role capability matrix, two-tenant denial tests, local OAuth port setup                                                                                                                                            | P0                                              |
| Agent builder                | `/playground`, widget configuration and live preview, model/instructions/escalation                                                                                                                                                                                                                                                          | Draft/publish versions, knowledge/source evidence, reusable test cases, deployment checklist                                                                                                                       | P1 / #40                                        |
| Knowledge                    | Files, URLs, sitemap, pasted text; durable ingestion records, Cloudflare queue transport, and shared SSRF-aware HTTP(S) fetching                                                                                                                                                                                                             | Source health/resync, scheduled sync, Q&A, version rollback                                                                                                                                                        | P0 crawler fix in PR #48; then P2 / #24 #25 #28 |
| Widget                       | Loader, origins, session tokens, messages, uploads, feedback, handoff; shared PostgreSQL IP, workspace, and visitor rate limits with fail-closed handling                                                                                                                                                                                    | Signed customer identity, plan-aware spend budgets, reconnect/delivery guarantees, accessibility                                                                                                                   | P0–P1 / #40                                     |
| Inbox                        | Assignment, public replies, internal notes, unread tabs, AI-reply state and assignee in the list/detail, one-action human takeover that pauses AI and interrupts active generation, resume/pause controls, contact context, copilot; common visitor, teammate, AI, and channel message appends now use workspace-scoped atomic JSONB updates | Atomic append coverage still needs a live concurrency test; first-message conversation creation and feedback/read mutations need race review; cursor pagination, durable live updates, saved views, labels, macros | P0–P2 / #20 #22 #40                             |
| Channels                     | Chat SDK adapter code and provider-scoped webhook route; Composio actions                                                                                                                                                                                                                                                                    | Per-tenant provider credentials/account binding, verified inbound/outbound round trips, delivery states                                                                                                            | P0 then P3 / #27                                |
| Actions / booking            | Typed registry, approval token/expiry, action audit/idempotency, workflow steps                                                                                                                                                                                                                                                              | Unknown provider outcome recovery, scoped admin permissions, reservations/corrections and independent confirmation retries                                                                                         | P0 then P2 / #23 #45 #46                        |
| Contacts / leads             | Contact notes, tags, identity links, lead capture, conversation context                                                                                                                                                                                                                                                                      | Inbox customer panel and searchable customer drawer, attribute schema, verified identity and segmentation                                                                                                          | P2 / #29 #30                                    |
| Tickets / support operations | Conversation status; no dedicated ticket route                                                                                                                                                                                                                                                                                               | Tickets, priority, snooze, SLAs, business hours, team/capacity routing, collision detection                                                                                                                        | P2 / #21                                        |
| QA / optimization            | Feedback, citations/context, AI telemetry and copilot audit                                                                                                                                                                                                                                                                                  | Eval datasets, groundedness checks, unresolved question triage, improvement loop                                                                                                                                   | P1–P2 / #31 #32                                 |
| Reporting                    | Dashboard analytics                                                                                                                                                                                                                                                                                                                          | Metric definitions, denominator clarity, operational reports, filters, exports, saved reports                                                                                                                      | P2 / #36                                        |
| Monetization / platform      | Plan-limit helpers and events                                                                                                                                                                                                                                                                                                                | Durable usage ledgers, enforced budgets, billing, API keys/webhooks, signed deliveries                                                                                                                             | P1 budgets; P3 platform / #38 #39               |
| Self-service / proactive     | No public help-center publishing flow                                                                                                                                                                                                                                                                                                        | Help center, custom domain, article lifecycle; later campaigns/tours                                                                                                                                               | P3–P4 / #33                                     |
| Product feedback             | No complete portal                                                                                                                                                                                                                                                                                                                           | Feedback-to-roadmap and changelog                                                                                                                                                                                  | P4 / #34 #35                                    |

Open issue numbers were read from GitHub. PR #48 proposes closing #24, #25, #27, but closure must
follow their acceptance criteria; queue transport is not scheduled source sync, and an adapter is
not a verified channel. Do not duplicate existing issues or equate PR prose with shipped behavior.

## Architecture constraints

Keep Next.js 16 on Vercel; PostgreSQL locally, Neon Postgres in production. Use pooled app
connections and unpooled migration connections. R2 stores files, Cloudflare AI Search handles
retrieval, and the deployed ingestion queue calls the authenticated Next.js worker endpoint.
This is not a D1 application and does not need a second application runtime.

Preserve AGENTS.md invariants:

- `workspace_member` is the membership boundary. Membership first; scope all resource queries.
- `widget.authorizedDomains` stays a JSON string array.
- `conversation.messages` stays the JSON array string; do not introduce a Message table.
- Attachments link to conversations directly.
- Google remains the only login method. Enterprise organization controls must work within that
  boundary; SAML login requires a separate explicit architecture decision.
- No production-critical state in instance memory. Database/client connection caching is not
  authoritative business state.
- Schema changes go through `src/lib/db/schema.ts`, named Drizzle SQL generation and migrations.
  Generate/check locally, apply locally, then apply to Neon only as an authorized release step.

### Correctness before transport

All transcript writers must share an atomic, tenant-scoped append/update path. A transaction at
read-committed isolation does not by itself protect read/modify/write JSON arrays. Use row locks,
atomic JSONB expressions cast back to text, or a consistent compare-and-swap revision with retry.
Client message and external event deduplication must happen inside the same transaction. Protect
first-conversation creation as well as updates. Preserve order and never discard a teammate note.

Publish durable outbox events after committed changes. Choose one managed realtime transport
compatible with Vercel after a latency/cost spike. Keep bounded polling as a reconnect fallback;
do not hold a permanent Node process in a serverless request or label a no-op broadcast realtime.
A future Durable Object may coordinate live presence, but Postgres remains the durable transcript.

External side effects have at-least-once delivery and uncertain outcomes. An idempotent local
record does not make a provider call exactly once. Pass provider-supported idempotency keys;
otherwise reconcile using provider IDs/request references before retry. Separate calendar creation
from confirmation delivery. A crash after sending must not automatically send again.

## Security release blockers from source inspection

These are evidence-backed risks, not a penetration test or a formal security certification.

| Priority      | Location                                                                                               | Evidence / impact                                                                                                                                                                                                                                                                                                     | Required acceptance                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0            | `src/lib/rate-limit/shared.ts`; chat/upload/identify/contact consumers                                 | Shared PostgreSQL UPSERT counters now enforce HMAC-keyed IP, workspace, and visitor limits; expired buckets are pruned by the authenticated daily cron. Local PostgreSQL tests cover concurrency, reset, cleanup, and database outage.                                                                                | Await CI and preview deployment; verify production proxy IP headers and tune per-workspace limits using observed demand                                              |
| P0            | `src/features/knowledge/server/crawl.ts`; `extract.ts`                                                 | Previously, host-string checks did not resolve DNS, redirects were followed, and direct URL extraction used global fetch. A shared guarded fetch is implemented in PR #48; focused tests pass locally.                                                                                                                | Await CI and external-host runtime acceptance; retain HTTP(S)-only, DNS pinning, redirect revalidation, private/reserved IPv4/IPv6 denial, and time/byte/page limits |
| P0            | `conversation-service.ts`; `queries.ts`; `omnichannel.ts`; `tool-executor.ts`                          | Common visitor, teammate, AI and channel append paths now use workspace-scoped atomic JSONB updates with client/reply dedupe. First-conversation creation and feedback/read mutations still need a race review; local PostgreSQL tests cover concurrent appends, duplicate webhooks, AI takeover and workspace scope. | Extend the two-workspace denial matrix to remaining mutation paths; preserve every message and create one record for duplicate events                                |
| P0            | `src/features/integrations/server/chat-sdk.ts`; `omnichannel.ts`                                       | Channel AI now checks pause/status before generation, before transcript append, and immediately before outbound send; provider round trips and takeover races still need runtime acceptance.                                                                                                                          | Prove no AI post after human takeover across each connected channel and verify consistent handoff behavior                                                           |
| P0            | `src/features/integrations/server/tool-executor.ts:190,256`                                            | A provider success followed by lost response/local completion can be marked failed and retried                                                                                                                                                                                                                        | Model unknown outcomes; reconcile before retry; prove no duplicate calendar event/message/email under timeout/crash                                                  |
| P0 policy gap | Dashboard integration/action routes use membership context without a specific manage/approve role gate | Membership isolation exists; privileged capabilities have no separate authorization policy in inspected routes                                                                                                                                                                                                        | Document owner/admin/support/viewer permissions; enforce on server; prove denial for disallowed roles and foreign resources                                          |
| P1            | `src/app/api/dashboard/conversations/route.ts:25`; `queries.ts`                                        | Loads all workspace transcripts, then slices in memory                                                                                                                                                                                                                                                                | DB cursor pagination; aggregate counts; bounded payload and resource use; validate page/search inputs                                                                |
| P1            | `src/features/knowledge/server/retrieval.ts:101` and fallback                                          | `any` casts and fallback to recent chunks when lexical matching fails                                                                                                                                                                                                                                                 | Typed retrieval; relevance thresholds; explicit no-evidence response; tenant/source permission tests                                                                 |

Additional threat-model work: signed visitor identity (an email claim is not account verification),
attachment access/expiry and malware policy, prompt injection from retrieved files, secret/log
redaction, webhook signature/replay windows, resource ownership after membership removal,
CSRF/origin enforcement for dashboard mutations, deletion/export/retention, backup restore.
Never let model instructions override authorization, recipient allowlists, approval policy, or cost
budgets. No refund/account change based only on an unauthenticated visitor's stated email.

## Delivery phases and acceptance gates

Estimates are planning ranges for one experienced full-time engineer, excluding provider approval,
compliance audits and enterprise procurement. They are not completion promises. Every phase
ships complete flows, not navigation placeholders. Re-estimate after P0 and real usage.

| Phase                                | Indicative effort                         | Deliverables                                                                                                                 | Exit gate                                                                                                                                                                 |
| ------------------------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0: reliable foundation              | 2–4 engineering weeks                     | Security blockers, atomic messages, shared budgets, role gates, auth setup, honest copy, critical regression harness         | Two-workspace denial matrix; concurrent-send/duplicate-event tests; crawler SSRF tests; AI pause and action timeout tests; widget-to-human browser round trip             |
| P1: sellable support loop            | 3–5 weeks after P0                        | Setup checklist, agent Build/Test/Deploy tabs, tested widget, fast inbox, clear ownership/delivery states, basic evals/usage | New workspace installs agent without developer help; ready source cited; no-evidence escalates; teammate takes over; feedback links to improvement; measured cost/latency |
| P2: team support parity              | 5–8 weeks after P1                        | Saved views, labels/macros, snooze, tickets/priorities, business hours/SLAs, teams/routing, contact UI, sync/QA/reporting    | Multi-agent support team handles a working day without spreadsheet workarounds; SLA timers correct across time zones; reports reconcile to transcripts and audit data     |
| P3: channels and commercial platform | 6–10 weeks after P2, per-channel rollouts | Email first, then priority customer channels; help center; billing; API keys and signed webhooks; provider-health screens    | Each channel has inbound/reply/retry/handoff acceptance; signature and tenant-binding tests; billing reconciles; revoke key stops access                                  |
| P4: broader suite                    | Separate investment                       | Campaigns/tours, advanced procedures, multilingual evaluation, voice, account segmentation, feedback/changelog               | Per-feature outcomes and customer demand justify launch; no parity claim from merely adding pages                                                                         |

P0–P3 total is roughly 16–27 engineering weeks before external lead times; much can change after
actual acceptance testing. Matching every mature competitor feature, ecosystem, compliance
program and proprietary AI quality is an ongoing product program, not a single PR.

### First ten implementation slices

1. Safe crawler/extractor network boundary with redirect, DNS rebinding and byte-limit tests.
2. Shared public-endpoint rate limiter and durable usage budgets before model/storage calls.
3. Shared atomic transcript writes and dedupe, including session/bootstrap races.
4. Server role permissions for manage-integrations, publish-agent, approve-actions, export/delete.
5. Channel human takeover and AI pause guards; preserve reply ownership and delivery states.
6. Provider-action unknown-outcome state and reconciliation; booking confirmation retry separated.
7. DB cursor inbox query and count aggregates; honest presence and connectivity UI.
8. Inbox saved views, labels and macros as one vertical slice, with mobile detail access.
9. Agent draft/publish lifecycle and repeatable grounded-answer/no-answer/handoff test cases.
10. Source health/resync + unanswered-question improvement queue with a first evaluation dataset.

Each slice includes domain/API/query/UI changes, permission checks, failure recovery, focused
behavioral tests where risk warrants them, `pnpm lint`, `pnpm typecheck`, formatting and build,
and browser acceptance. The previous roadmap's blanket exclusion of automated tests is removed:
manual smoke checks cannot establish tenant isolation, race safety or idempotent side effects.

## Navigation and screen contract

See [product-design.md](./product-design.md) for dimensions, visual system and interaction states.

The owner explicitly prefers fewer pages and low complexity. Launch with **three primary
destinations: Inbox, Agent and Insights**, plus Settings at the bottom. Feature parity is a
capability goal, not a requirement to copy competitors' navigation or create a page per feature.

| Destination            | Main task                                   | Where related capabilities live                                                                                                                                              |
| ---------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inbox `/conversations` | Triage, reply, handoff, close               | Saved views and ticket queues in the list; contact history, attributes and linked tickets in the Details panel; approvals attached to their conversation                     |
| Agent `/playground`    | Build → Test → Deploy → Improve             | Knowledge and instructions in Build; repeatable evaluations in Test; widget/channels in Deploy; unanswered questions in Improve; actions configured alongside agent behavior |
| Insights `/dashboard`  | Understand support quality, volume and cost | Existing overview and reports share one screen with filters and detail drill-downs; setup checklist appears here until completed                                             |
| Settings               | Manage the workspace                        | Teammates/roles, connected business tools, business hours, usage/billing, developer and privacy grouped within one settings surface                                          |

Keep channels (message delivery) and business-tool connections (agent actions) clearly named
inside these surfaces, without making them separate sidebar destinations. Help-center publishing
belongs under Agent deployment; the public help center is a customer-facing destination.
Campaigns, voice and other P4 capabilities stay out of the default navigation until customer
demand establishes a coherent place for them.

Existing Knowledge and Integrations routes remain functional during consolidation; preserve
deep links when moving their content. The initial sidebar consolidation is implemented:
Inbox, Agent and Insights, plus Settings (currently connections). Agent section navigation
links configuration/testing and knowledge. The complete contextual feature contract above
still requires the corresponding implementation phases. Do not show links to empty future routes.
Selecting a workspace clears incompatible caches/selection and scopes every page.

Add a new top-level destination only when an existing surface cannot support a recurring,
distinct customer task. Prefer contextual drawers, detail views and a few named tabs; do not
hide essential work behind nested menus. Validate the setup → test → inbox journey with a
first-time user before expanding the shell.

## Definition of readiness

- Customer journey is complete with no fake controls, fabricated stats or unbacked certification.
- Google-only auth and two-tenant authorization checks pass at every exposed boundary.
- Visitor-to-AI-to-human flow works in browser; internal notes never appear to visitors.
- Keyboard, screen-reader names, 320px, 200% zoom, long content and reduced motion pass.
- Rendered text contrast meets its threshold in both themes; measurements stored in QA evidence.
- Reconnect, duplicate delivery, provider outage, deploy interruption and unknown outcome recover.
- A benchmark dataset measures answer grounding, fallback/handoff, latency and cost; product
  resolution is not inferred simply from conversation closure or lack of a human reply.
- Logs omit secrets/transcript PII, support has runbooks and alerts, restore is exercised.
- Code present, locally validated, pushed, CI passed, deployed and accepted are separate states.

## Status of this assessment

PR #48 checks reported success for quality, React Doctor, GitGuardian and Vercel at the inspected
head. The CI quality job runs lint/types/format; those checks do not certify runtime behavior.
Prior review comments were read. Several older booking/webhook findings have been reworked in
the current source; do not repeat outdated comments as current defects. Provider setup remains a
release dependency described in the PR.

This pass updates the roadmap/design/evidence docs and begins public-flow/inbox UX corrections.
Synthetic local testing exposed blank preview completion. Widget SSE framing, empty/aborted
response recovery and five stream regression tests are now corrected locally; CI includes the
stream tests. Knowledge ingestion reached READY for the named QA-only fixture. See
[the assessment](product-assessment.md) for the exact validation boundary.
Full competitor parity is not implemented. Authenticated browser acceptance and paid provider
round trips must be recorded separately when actually completed.
