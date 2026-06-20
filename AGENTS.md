# widget Engineering Guide

This file is the source of truth for product intent, architecture, setup,
delivery order, and implementation rules. Read it before changing code.

## Product

widget is an AI-first, multi-tenant customer support platform combining ideas
from Chatbase, Pylon, Intercom, and Chatwoot while staying simple and modular.

Core customer journey:

1. Customer creates a workspace with Google authentication.
2. Customer installs one script on their website.
3. Visitor opens the embedded widget and starts a conversation.
4. AI answers using workspace knowledge and conversation context.
5. AI uses approved tools or escalates when it cannot safely help.
6. Human teammate continues the same conversation in the shared inbox.
7. Durable workflows execute external actions and follow-ups.
8. Workspace owners monitor outcomes through analytics.

V1 is complete when widget installation, messaging, grounded AI, knowledge
upload/search, inbox replies, human handoff, basic integrations, reliable
workflows, and basic analytics work in production.

Not V1: voice agents, WhatsApp, SMS, mobile apps, enterprise SSO, marketplace,
CRM pipeline management, advanced ticketing, compliance suites, or advanced
RBAC.

## Product priorities

Build customer value in this order:

1. Widget
2. Inbox
3. AI agent
4. Knowledge base
5. Human handoff
6. Actions
7. Workflows
8. Analytics

Build vertical slices. Every milestone must be deployable, observable, and
testable. Do not build all backend or all frontend first.

## Core architecture

widget is one Next.js application and one repository. Frontend, route handlers,
server actions, authentication, and business logic share one deployable unit.
Do not add a separate API service or microservice until a measured requirement
justifies it.

```text
Customer website
  -> Embedded widget
  -> Next.js application
       -> Conversation service
       -> Shared inbox
       -> Knowledge retrieval
       -> Agent runtime
       -> Integrations
       -> Durable workflows
            -> External systems
```

Application servers remain stateless. Persistent state belongs in D1, R2,
Vectorize, or workflow state. No feature may depend on in-memory state across
requests.

## Approved technology stack

### Application

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS v4
- shadcn/ui source components using Base UI
- Hugeicons
- next-themes
- TanStack Query for client-side remote state
- Zustand only when shared client state becomes necessary

Use Server Components by default. Push `"use client"` to the smallest
interactive boundary. Use Server Actions for authenticated in-app mutations.
Use Route Handlers for public APIs, widget APIs, webhooks, file uploads, and
streaming.

### Authentication

- Better Auth
- Google OAuth only
- Modal entry point; no login, registration, password-reset, or password pages
- First successful sign-in creates one workspace and OWNER membership

Google callback:

```text
/api/auth/callback/google
```

### Data and infrastructure

- Cloudflare D1 for relational data
- Prisma ORM with SQLite provider and `@prisma/adapter-d1`
- Cloudflare R2 for documents, uploads, attachments, and knowledge assets
- Cloudflare Search for keyword search
- Cloudflare Vectorize for semantic retrieval
- Vercel for Next.js deployment

D1 is SQLite-compatible and Prisma D1 support is preview. Keep database access
behind `src/lib/db`. Better Auth's Prisma adapter must use `provider: "sqlite"`.
Every product query must be scoped to a workspace.

### AI

- Vercel AI SDK for every model interaction
- OpenAI and Gemini providers initially
- Eve as intended agent orchestration layer
- AI Gateway may be introduced when routing, failover, or centralized usage
  tracking becomes necessary

Do not call provider SDKs directly unless AI SDK cannot support a requirement.
Do not add AI runtime packages before the AI phase starts.

### Workflows and integrations

- Vercel Workflow for durable execution, retries, delays, schedules, and human
  approval
- Vercel Connect for supported third-party OAuth and connection management

External side effects must run through workflows. UI requests and AI tools may
request an action, but they must not directly send email, create calendar
events, or mutate external CRMs.

### Tooling

- pnpm
- Oxlint; never add ESLint
- Oxfmt; never add Prettier
- TypeScript compiler
- Husky and lint-staged
- GitHub Actions

Oxc minifier is alpha and is not wired into Next.js. Next.js owns production
minification until supported integration exists.

## Repository structure

```text
src/
├── app/             # routes, layouts, route handlers
├── components/      # shared UI and shell components
├── features/        # domain feature modules
├── hooks/           # shared React hooks
├── lib/             # infrastructure adapters and shared utilities
├── providers/       # client providers
├── server/          # server-only application services
├── styles/          # shared styles if globals.css is insufficient
└── types/           # shared and generated infrastructure types

src/features/
├── auth/
├── workspaces/
├── contacts/
├── conversations/
├── inbox/
├── widget/
├── agents/
├── knowledge/
├── integrations/
├── workflows/
└── analytics/

src/lib/
├── ai/
├── auth/
├── db/
├── cloudflare/
├── search/
├── vector/
├── workflows/
├── integrations/
└── utils/

src/lib/ai/
├── agents/
├── tools/
├── prompts/
├── retrieval/
├── memory/
└── evaluations/
```

Create folders only when code needs them. Do not add empty architecture.

## Domain rules

### Multi-tenancy

- Every customer-owned row must include or resolve to a workspace.
- Authorization checks must validate workspace membership on every server
  boundary.
- Never trust workspace IDs supplied by the client without membership checks.
- Cross-workspace access is a security bug.
- OWNER can manage workspace, members, agent config, integrations, analytics,
  and billing.
- MEMBER can use inbox, contacts, and conversations but cannot manage billing,
  delete a workspace, or change workspace-level ownership.
- VISITOR can use widget messaging and uploads only within its visitor session.

### Conversations

Supported states:

- OPEN: active and unassigned
- ASSIGNED: owned by a teammate
- ESCALATED: awaiting or under human intervention
- CLOSED: resolved

A visitor message creates or updates a conversation, stores the message, emits
an event, and begins agent processing. Assignment changes ownership. Human
handoff must preserve full conversation continuity. Internal notes are visible
only to workspace members and must never reach the visitor.

### Widget

V1 widget supports:

- Open and close
- Send and stream messages
- File uploads
- Visitor identity and session restoration
- Conversation persistence
- Logo, brand color, welcome message, and left/right position
- One customer installation script

### AI agent

Agent config includes name, instructions, welcome message, and escalation
rules. Escalate when the visitor asks for a human, confidence is too low, policy
requires approval, or the agent cannot safely complete the request.

Knowledge priority:

1. Retrieved document context
2. Workspace instructions and facts
3. Conversation history
4. Contact context
5. Model reasoning

AI is an enhancement layer, never the source of truth.

### Knowledge and retrieval

V1 sources: PDF, DOCX, TXT, and website URLs.

Document lifecycle:

- PROCESSING
- READY
- FAILED

Pipeline:

```text
Upload
  -> Extract text
  -> Chunk
  -> Generate embeddings
  -> Store vectors
  -> Retrieve
  -> Inject context
  -> Return answer with sources
```

Document processing, crawling, and embedding generation are asynchronous
workflows. Retrieval must track source attribution.

### Integrations and actions

Initial integrations:

- Gmail: connect, send email, inspect status
- Google Calendar: connect, create and update events
- Slack: connect, send workspace notifications

Initial agent actions:

- Draft/send email
- Create/reschedule meeting
- Assign conversation
- Add internal note

Actions may require human approval. All external actions need idempotency keys,
automatic retry policy, status visibility, and duplicate prevention.

### Search and analytics

Global search covers contacts, conversations, and documents. Results show type,
title, preview, and pagination.

Track:

- Total/open/closed conversations
- Messages and contacts
- AI responses, escalations, and resolution rate
- Documents, retrievals, and source usage
- Workflow runs, failures, and retries

### Notifications and audit trail

Notify members about new conversations, assignments, escalations, and workflow
failures. Track conversation, contact, integration, agent, and workflow events.

## Reliability model

Important operations emit domain events:

- Conversation created
- Message received
- Message sent
- Agent replied
- Escalation triggered
- Workflow started
- Workflow completed
- Workflow failed

Events support analytics, monitoring, auditing, and future automation. They do
not require a separate event bus during MVP.

All external operations must:

- Be safe to retry
- Use idempotency keys
- Avoid duplicate side effects
- Define retry and terminal failure behavior
- Produce structured logs

Long-running work never runs inside request handlers. Use workflows for
document processing, embeddings, email, sync jobs, follow-ups, and
escalations.

## Security rules

- Authentication is required for dashboard routes.
- Authorization is required for every server action and route handler.
- Server actions receive the same auth scrutiny as public APIs.
- Secrets stay server-only and are validated with T3 Env.
- Never expose non-`NEXT_PUBLIC_` environment variables to client bundles.
- Widget and API endpoints require rate limiting before production.
- Validate all untrusted input with Zod at server boundaries.
- Uploaded files require size, type, ownership, and malware-risk controls.
- Security takes precedence over convenience.

## Observability

Log major operations with stable identifiers:

- request ID
- workspace ID
- conversation ID
- workflow run ID
- agent execution ID
- integration action ID

Monitor request failures, model failures, workflow failures, integration
failures, latency, and retry counts. Sentry, OpenTelemetry, Langfuse, and
PostHog are optional integrations, not core dependencies.

## Error handling

User-facing errors must be specific, safe, and actionable. Provide retry paths
when retry is valid. Never leak provider responses, credentials, stack traces,
or internal IDs to visitors.

System errors must retain enough structured context for diagnosis and must not
silently swallow workflow, integration, retrieval, or agent failures.

## Environment variables

Copy `.env.example` to `.env.local`. T3 Env validates server variables during
Next.js startup and builds. `SKIP_ENV_VALIDATION=1` is allowed only for CI
quality/build verification that does not execute runtime integrations.

Required for current foundation:

```env
DATABASE_URL="file:./prisma/dev.db"
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Optional D1 mode; leave all blank for local SQLite:

```env
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
D1_DATABASE_ID=
```

Planned phases:

```env
R2_BUCKET_NAME=widget
VECTORIZE_INDEX=widget-knowledge
OPENAI_API_KEY=
GEMINI_API_KEY=
VERCEL_TOKEN=
VERCEL_CONNECT_SECRET=
```

OpenAI and Gemini keys are accepted now but remain optional until the agent
phase.

## Database and authentication invariants

- Prisma datasource provider is `sqlite`.
- Local runtime uses `PrismaBetterSqlite3` and `DATABASE_URL`.
- Hosted D1 runtime uses `PrismaD1` when Cloudflare account, API token, and D1
  database ID are all configured.
- Better Auth uses its Prisma adapter with `provider: "sqlite"`.
- Prisma client is generated into `src/generated/prisma` and ignored by git.
- Better Auth core tables are `user`, `session`, `account`, and `verification`.
- Workspace ownership uses `workspace` and `membership`.
- First OAuth user creation creates one workspace and one OWNER membership.
- Session token and user email remain unique.
- User/workspace relations cascade on delete where defined.

Schema changes:

1. Edit `prisma/schema.prisma`.
2. Run `pnpm db:migrate -- --name <name>` against local SQLite.
3. Review generated SQL.
4. Run `pnpm db:deploy` to apply pending SQL for the configured Prisma
   database.
5. Run `pnpm db:generate`.
6. Verify Better Auth sign-in and workspace creation.

Never run destructive migration commands against production without backup and
explicit approval.

## Local setup

Requirements:

- Node.js 24
- pnpm 11
- Google OAuth application
- Cloudflare account and D1 database

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`pnpm dev` starts Next.js. Local SQLite is the default; complete D1 environment
variables switch runtime to Cloudflare, but D1 deployment automation is not
part of the bootstrap.

Google OAuth redirect URI for local development:

```text
http://localhost:3000/api/auth/callback/google
```

Add the matching production callback to Google Cloud Console.

## Commands

```bash
pnpm dev           # Next.js development server
pnpm build         # production build
pnpm start         # run production build
pnpm lint          # Oxlint
pnpm lint:fix      # safe Oxlint fixes
pnpm lint:github   # GitHub annotation format
pnpm fmt           # write formatting with Oxfmt
pnpm fmt:check     # verify formatting
pnpm typecheck     # TypeScript
pnpm check         # lint + typecheck + format check
pnpm db:deploy     # apply existing Prisma migrations during deployment
pnpm db:generate   # generate Prisma client
pnpm db:migrate    # create/apply local SQLite migration
pnpm db:studio     # Prisma Studio
```

Pre-commit runs Oxlint and Oxfmt through lint-staged. CI uses frozen pnpm
lockfile, Oxlint GitHub annotations, typecheck, Oxfmt check, and Next.js build.

## Implementation rules

1. Keep business logic outside UI components.
2. Keep infrastructure clients behind lazy getters; build must not initialize
   services before runtime env exists.
3. Prefer direct imports over barrel exports.
4. Avoid serial async waterfalls; parallelize independent operations.
5. Minimize data serialized from Server Components to Client Components.
6. Authenticate and authorize all mutations.
7. Add dependencies only when current code uses them.
8. Install only shadcn components needed by current UI.
9. Preserve accessible names, keyboard behavior, focus states, and touch
   targets.
10. Use theme tokens instead of ad-hoc colors.
11. Use Geist Sans for UI and Geist Mono for IDs, timestamps, and metrics.
12. Do not introduce microservices, event buses, Kubernetes, complex RBAC, or
    generic frameworks during MVP.
13. Prefer one concrete implementation over speculative abstractions.
14. Update this file when architecture or product decisions change.

## Approved architectural decisions

All decisions are approved unless a newer numbered decision changes them.

1. Single Next.js application; no separate backend initially.
2. Next.js is the primary frontend and backend runtime.
3. Cloudflare D1 with Prisma is the relational database.
4. Cloudflare R2 is object storage.
5. Cloudflare Vectorize is semantic search.
6. Cloudflare Search is keyword search.
7. All model calls use Vercel AI SDK.
8. AI Gateway is introduced when centralized routing is needed.
9. Eve is the intended agent orchestration runtime.
10. Vercel Workflow is the durable workflow engine.
11. Vercel Connect manages supported third-party connections.
12. Major operations emit events.
13. Long-running work is asynchronous.
14. External side effects belong to workflows.
15. Workflows and actions are idempotent.
16. AI responses stream whenever possible.
17. Human handoff is a first-class feature.
18. Retrieved knowledge has priority over model knowledge.
19. All customer data is workspace-scoped.
20. Important operations are observable.
21. Security takes precedence over convenience.
22. Simplicity takes precedence over speculative flexibility.
23. Enterprise features must not block MVP.
24. Customer-facing value determines priority.
25. Google OAuth is the only authentication method.

For a new architecture decision, add a numbered entry here with status,
decision, reasoning, and consequences.

## Delivery roadmap

### Phase 0: foundation

Goal: deployable development foundation.

- Repository, CI, environment validation, deployment path
- Next.js, TypeScript, Tailwind, Base UI/shadcn
- Google auth and protected dashboard
- Prisma schema and D1 adapter
- R2 and Vectorize configuration
- Logging and error reporting foundation

Exit: developers can install, validate, build, deploy, authenticate, and access
an isolated workspace.

### Phase 1: workspace and inbox

- Workspace onboarding, settings, members, roles
- Sidebar, header, user menu, workspace switcher
- Conversation list and detail
- Message view
- Contact list and detail

Exit: user creates account/workspace and accesses functional dashboard/inbox.

### Phase 2: widget and messaging

- Widget SDK, bootstrap script, launcher, chat UI
- Branding and position
- Visitor identity and session restoration
- Send, receive, store, and stream messages
- Conversation open/assigned/closed lifecycle
- Attachments, typing, delivery/read status

Exit: customer installs widget; visitor messages appear in inbox end-to-end.

### Phase 3: AI agent

- Vercel AI SDK and Eve integration
- Agent config and prompt management
- Conversation/workspace/contact context
- Stream and persist AI responses
- Tool registry and permissions foundation

Exit: agent holds contextual conversations.

### Phase 4: knowledge and retrieval

- PDF, DOCX, TXT, URL ingestion
- Document list/delete/search and status
- Extraction, chunking, embeddings, Vectorize indexing
- Retrieval, context assembly, citations

Exit: agent answers from uploaded knowledge with source attribution.

### Phase 5: human handoff

- Escalation rules and state
- Assignment/reassignment
- Human reply and AI pause
- Resume AI
- Assignment/escalation notifications

Exit: AI-to-human and human-to-AI continuity works.

### Phase 6: integrations and actions

- Connection management UI
- Gmail, Google Calendar, Slack
- Email/calendar/internal tools
- Approval and permission model
- Durable execution and action status

Exit: approved agent actions affect external systems safely.

### Phase 7: workflows

- Workflow registry, execution, status, history
- Document, follow-up, and escalation workflows
- Scheduling, retries, recovery, dead-letter handling
- Idempotency keys and duplicate prevention

Exit: long-running tasks survive failures and expose status.

### Phase 8: analytics

- Conversation, contact, and message metrics
- AI response/escalation/resolution metrics
- Knowledge usage
- Workflow success/failure/retry metrics
- Daily activity and trend charts

Exit: customers can measure support operations.

### Post-MVP

- Advanced integrations: HubSpot, Notion, Salesforce
- Multi-agent support and advanced memory
- Visual workflow builder and action marketplace
- Enterprise RBAC, audit compliance, SSO

## Master backlog

Status:

- `[ ]` not started
- `[/]` in progress
- `[x]` complete
- `[B]` blocked

### Foundation

- [x] Repository initialized with remote
- [x] Next.js App Router application
- [x] Strict TypeScript
- [x] Tailwind v4 and shadcn/Base UI
- [x] TanStack Query and theme providers
- [x] Oxlint, Oxfmt, Husky, lint-staged
- [x] GitHub Actions quality pipeline
- [x] T3 Env validation and `.env.example`
- [x] Google OAuth route and modal
- [x] Protected dashboard shell
- [x] Prisma SQLite schema and D1 runtime adapter
- [x] Initial migration
- [ ] Connect real D1 credentials and apply migration
- [ ] Configure R2
- [ ] Configure Vectorize
- [ ] Configure Cloudflare Search
- [ ] Configure deployment project
- [ ] Structured logging
- [ ] Error tracking
- [ ] Request tracing

### Authentication and users

- [x] Google OAuth modal and callback
- [x] Session validation for dashboard
- [x] Initial workspace and owner membership hook
- [ ] Sign out
- [ ] Session expiration UX
- [ ] User profile
- [ ] Profile update

### Workspaces and team

- [ ] Onboarding and workspace selection
- [ ] Workspace settings: name, logo, timezone, branding
- [ ] Invite and accept member
- [ ] Member list
- [ ] Remove member
- [ ] Update role
- [ ] Transfer ownership

### Dashboard

- [x] Responsive sidebar and header shell
- [ ] Functional workspace switcher
- [ ] Functional user menu
- [ ] Inbox page
- [ ] Contacts page
- [ ] Knowledge page
- [ ] Integrations page
- [ ] Settings page

### Contacts

- [ ] Create, edit, delete, list
- [ ] Profile, timeline, notes, tags
- [ ] Search, filter, sort

### Conversations and messaging

- [ ] Create, update, close, reopen
- [ ] List, details, filters, search
- [ ] Open, assigned, escalated, closed states
- [ ] Send, receive, store, load history
- [ ] Streaming, typing, delivery, read status
- [ ] Upload, store, and render attachments

### Widget

- [ ] Package/bootstrap structure
- [ ] Initialization and configuration
- [ ] Launcher and chat interface
- [ ] Message rendering and streaming
- [ ] Logo, color, welcome message, position
- [ ] Visitor identity and session persistence
- [ ] Conversation persistence

### AI agent

- [ ] Install AI SDK providers when phase starts
- [ ] Eve runtime and execution layer
- [ ] Agent config and context system
- [ ] Prompt/workspace instruction management
- [ ] Generate, stream, and store responses
- [ ] Conversation, workspace, and contact memory

### Knowledge

- [ ] Upload, list, delete, search documents
- [ ] Extract, chunk, embed, index
- [ ] Semantic retrieval and context assembly
- [ ] Source attribution

### Human handoff

- [ ] Escalation rules/actions/state
- [ ] Assign/reassign and notify
- [ ] Human reply mode
- [ ] AI pause/resume

### Integrations and actions

- [ ] Integration page, connection lifecycle, status
- [ ] Gmail connect/send/status
- [ ] Calendar connect/create/update
- [ ] Slack connect/notify
- [ ] Tool registry, execution, permissions
- [ ] Email, calendar, assignment, note tools

### Workflows and reliability

- [ ] Workflow setup, registry, execution, dashboard
- [ ] Document, follow-up, escalation workflows
- [ ] Retry strategy/config/visibility
- [ ] Idempotency keys and duplicate prevention
- [ ] Failure logging/recovery/dead-letter handling

### Notifications, search, analytics, audit

- [ ] Conversation, assignment, escalation notifications
- [ ] Workflow completion/failure notifications
- [ ] Global search with grouping, preview, pagination
- [ ] Conversation/contact/message metrics
- [ ] Agent/knowledge/workflow metrics
- [ ] Event tracking, history, filtering, search

### Security and production

- [ ] Authorization checks and workspace isolation tests
- [ ] Widget/API/agent rate limits
- [ ] Monitoring and workflow visibility
- [ ] Security review
- [ ] Performance review
- [ ] Production customer readiness review

## Acceptance criteria

- First Google sign-in creates one workspace and makes user OWNER.
- Returning Google user receives valid session and enters dashboard.
- Owner can invite/remove members and change roles.
- New visitor message appears in inbox and begins agent processing.
- Assignment records teammate ownership.
- Internal notes never reach visitors.
- Relevant uploaded knowledge is used in responses with sources.
- Low-confidence or requested handoff marks conversation ESCALATED.
- Human can take over and later resume AI.
- External actions are durable, visible, approved when required, and safe to
  retry.
- Errors show clear user guidance and retain system diagnostics.

## Definition of done

A change is done only when:

- Behavior matches this guide.
- Workspace isolation and auth boundaries are correct.
- Loading, empty, error, and success states exist where relevant.
- `pnpm check` passes.
- `pnpm build` passes.
- Relevant tests or end-to-end verification pass.
- No unused dependency, dead source, stale placeholder, or generated artifact
  is committed.
- README and this guide reflect setup or architecture changes.
