# Widget Platform — Product Documentation

> **Last updated:** June 2026  
> **Status:** Base application in progress

This document is organized into three sections:

| Section                                                                  | What it covers                                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **[Part I — Current Structure](#part-i--current-structure)**             | What is built today — architecture, features, APIs, database, SDK usage, and known gaps |
| **[Part II — Future Implementations](#part-ii--future-implementations)** | What will be built — all 9 planned features + Vercel SDK stack integration              |
| **[Part III — Planning & Roadmap](#part-iii--planning--roadmap)**        | How and when to build it — phases, priorities, costs, SDK adoption, and dependencies    |

---

## Product Vision

Widget is an AI-powered customer engagement platform. A business installs a one-line script on their website, and visitors get a branded chat assistant grounded in the company's knowledge base. The platform captures leads, escalates to humans when needed, and will eventually execute actions like booking meetings, updating CRMs, and sending WhatsApp follow-ups.

```text
Customer website
  → One-line loader (widget.bundle.js)
  → Embedded widget (vanilla JS)
  → Next.js application (API + dashboard)
  → AI agent (Vercel AI SDK)
  → Knowledge retrieval (RAG)
  → Background jobs (Queue SDK — planned)
  → Durable flows (Workflow SDK — planned)
  → Multi-channel (Chat SDK — planned)
  → Dashboard (analytics, settings, inbox, integrations)
```

---

# Part I — Current Structure

Everything that exists in the codebase today.

---

## 1.1 Architecture Overview

### Tech Stack

| Layer              | Technology                                                                           |
| ------------------ | ------------------------------------------------------------------------------------ |
| Framework          | Next.js 16 (App Router), React 19, TypeScript                                        |
| Styling            | Tailwind CSS v4, shadcn/ui, Base UI                                                  |
| Auth               | Better Auth — Google OAuth only                                                      |
| Database           | Drizzle ORM — SQLite locally (`dev.db`), Cloudflare D1 in production                 |
| State              | TanStack Query, Zustand, nuqs                                                        |
| AI                 | [Vercel AI SDK](https://ai-sdk.dev/) (`ai` v6) + `@ai-sdk/openai` + `@ai-sdk/google` |
| Async jobs         | Custom `WorkflowRun` DB tracking (not Workflow SDK or Queue SDK yet)                 |
| Multi-channel chat | Not integrated ([Chat SDK](https://chat-sdk.dev/) planned)                           |
| Storage            | Local filesystem (dev) / Cloudflare R2 (prod)                                        |
| Knowledge search   | Cloudflare AI Search with D1 text fallback                                           |
| Document parsing   | `pdf-parse`, `mammoth` (DOCX)                                                        |
| Widget embed       | Vanilla JS bundled via esbuild → `public/widget.bundle.js`                           |

### Repository Layout

```text
src/
├── app/                    # Next.js routes and API handlers
│   ├── (dashboard)/        # Authenticated dashboard pages
│   ├── api/dashboard/      # Workspace-scoped APIs
│   ├── api/widget/         # Public widget APIs (no auth)
│   └── api/auth/           # Better Auth
├── components/             # Shared UI (sidebar, widget customizer, integrations)
├── features/               # Domain modules
│   ├── auth/
│   ├── conversations/
│   ├── integrations/
│   ├── knowledge/
│   ├── leads/
│   ├── widget/
│   └── workspaces/
├── hooks/                  # TanStack Query hooks and query keys
└── lib/                    # DB, AI, auth, storage, Cloudflare, workflows

public/widget/              # Embeddable widget source
src/lib/db/schema.ts        # Database schema (24 tables)
```

### Core Design Rules

1. **Type safety** — no `any`; strict TypeScript throughout.
2. **Stateless servers** — no in-memory state across requests.
3. **Multi-tenancy** — every query scoped to `workspaceId` via `WorkspaceMember`.
4. **JSON storage** — `Widget.authorizedDomains` and `Conversation.messages` are JSON string arrays.
5. **Google-only auth** — dashboard access via Google OAuth.

---

## 1.2 Implemented Features

### Embedded Widget ✅ (Production-ready)

The most complete part of the platform.

| Capability   | Details                                                            |
| ------------ | ------------------------------------------------------------------ |
| Install      | `<script src=".../widget.bundle.js" data-widget-key="PUBLIC_KEY">` |
| Security     | Domain allowlisting, CORS, HMAC session bootstrap                  |
| Chat         | SSE streaming AI with knowledge-grounded responses                 |
| Lead capture | Keyword, time, and message-count triggers                          |
| Documents    | Brochure/document search in chat UI                                |
| Feedback     | Thumbs up/down on messages                                         |
| Identity     | Visitor identification API                                         |
| Preview      | Live preview inside dashboard customizer                           |

**Key files:** `public/widget/`, `src/features/widget/server/widget-agent.ts`, `src/app/api/widget/[publicKey]/chat/route.ts`

---

### Widget Dashboard (Customizer) ✅

Route: `/widget`

| Tab          | Configures                                                     |
| ------------ | -------------------------------------------------------------- |
| General      | Display name, welcome message, placeholder                     |
| Style        | Colors, theme, position, launcher size, border radius, shadows |
| Content      | Suggestions, preview messages, branding toggle                 |
| Lead Capture | Enable/disable, keywords, time/message thresholds              |
| Embed        | Authorized domains, copy-paste embed snippet                   |

**Partial:** AI settings (instructions, model, escalation keywords) exist in schema and server actions but are not in the customizer UI. `AgentSettingsForm` exists but is not mounted.

---

### Conversations / Inbox ✅

Route: `/conversations`

| Capability                                          | Status |
| --------------------------------------------------- | ------ |
| Session-based inbox with search, pagination, sort   | ✅     |
| Detail view with messages and visitor metadata      | ✅     |
| Statuses: OPEN, ASSIGNED, ESCALATED, CLOSED         | ✅     |
| AI escalation on keyword → pauses AI, notifies team | ✅     |
| Assignment and internal notes (server level)        | ✅     |
| Dashboard UI to assign, note, or reply as team      | ❌     |
| Real-time visitor ↔ agent messaging after handoff   | ❌     |

---

### Leads ✅ (Basic)

Route: `/leads`

| Capability                                        | Status |
| ------------------------------------------------- | ------ |
| Detection triggers (keyword, time, message count) | ✅     |
| Submit with dedup by email/phone                  | ✅     |
| Contact linking                                   | ✅     |
| Dashboard read-only table                         | ✅     |
| Lead detail page                                  | ❌     |
| Scoring, qualification, assignment                | ❌     |
| CRM export                                        | ❌     |

---

### Knowledge Base ✅ (Basic)

Route: `/knowledge-base`

| Capability                                     | Status |
| ---------------------------------------------- | ------ |
| Upload PDF, DOCX, TXT                          | ✅     |
| Single-page URL fetch + HTML strip             | ✅     |
| Chunking → AI Search indexing                  | ✅     |
| Retrieval with fallbacks (AI Search → D1 text) | ✅     |
| Dashboard add/delete sources                   | ✅     |
| Multi-page website crawling                    | ❌     |
| Notion, Drive, GitHub, API sources             | ❌     |
| Sync scheduling and health monitoring          | ❌     |

---

### AI / LLM Integration ✅

| Provider      | Env Var          | Models                               |
| ------------- | ---------------- | ------------------------------------ |
| OpenAI        | `OPENAI_API_KEY` | `gpt-5-mini`, `gpt-5.1`              |
| Google Gemini | `GEMINI_API_KEY` | `gemini-2.5-flash`, `gemini-2.5-pro` |

- Streaming via Vercel AI SDK `streamText`
- System prompt: instructions + knowledge + contact memory + citations
- Knowledge retrieval via Cloudflare AI Search

**Not yet:** OpenRouter, model selection in dashboard UI.

**Key files:** `src/lib/ai/providers.ts`, `src/features/widget/server/widget-agent.ts`

---

### Integrations ⚠️ (Scaffolded)

Route: `/integrations`

| Integration     | UI  | OAuth | Real Actions |
| --------------- | --- | ----- | ------------ |
| Gmail           | ✅  | ❌    | Simulated    |
| Google Calendar | ✅  | ❌    | Simulated    |
| Slack           | ✅  | ❌    | Simulated    |

- `IntegrationAction` model logs actions with idempotency
- `executeIntegrationAction` returns `{ simulated: true }`
- Tool registry exists but is not wired into the chat agent
- Future categories defined: CRM, Forms, Payments, Lead Sources

---

### Infrastructure ✅ (Ready for extension)

| Component           | Purpose                        | File                                                 |
| ------------------- | ------------------------------ | ---------------------------------------------------- |
| `WorkflowRun`       | Durable workflow tracking      | `src/lib/workflows/runner.ts`                        |
| `DomainEvent`       | Event log                      | `src/lib/events/domain-events.ts`                    |
| `Notification`      | In-app notifications (DB only) | `src/lib/notifications/create-notification.ts`       |
| `IntegrationAction` | Idempotent action log          | `src/features/integrations/server/execute-action.ts` |

---

### Auth & Workspace ✅

| Capability                               | Status |
| ---------------------------------------- | ------ |
| Google OAuth via Better Auth             | ✅     |
| Auto-provision workspace on signup       | ✅     |
| Workspace switcher                       | ✅     |
| Invite accept flow (`/invite/[token]`)   | ✅     |
| Member invite/role/remove server actions | ✅     |
| Settings & members dashboard pages       | ❌     |

---

## 1.3 Current Database Schema

**24 tables** in `src/lib/db/schema.ts`:

| Group            | Models                                                |
| ---------------- | ----------------------------------------------------- |
| Auth             | `User`, `Session`, `Account`, `Verification`          |
| Workspace        | `Workspace`, `WorkspaceMember`, `WorkspaceInvite`     |
| Widget           | `Widget`, `VisitorSession`                            |
| Contacts & Leads | `Contact`, `ContactNote`, `Lead`, `WidgetLeadCapture` |
| Conversations    | `Conversation`, `Attachment`                          |
| Knowledge        | `Document`, `DocumentChunk`                           |
| Integrations     | `Integration`, `IntegrationAction`                    |
| Platform         | `Notification`, `DomainEvent`, `WorkflowRun`          |

**Key constraints:**

- One `Widget` per `Workspace` (`workspaceId @unique`)
- Messages stored as JSON in `Conversation.messages` (no `Message` table)
- Authorized domains stored as JSON array in `Widget.authorizedDomains`

---

## 1.4 Current Routes & APIs

### Dashboard Pages

| Route             | Status                    |
| ----------------- | ------------------------- |
| `/`               | Marketing landing         |
| `/dashboard`      | Metrics snapshot          |
| `/conversations`  | Inbox                     |
| `/leads`          | Lead list                 |
| `/widget`         | Customizer + live preview |
| `/integrations`   | Integration cards         |
| `/knowledge-base` | Knowledge manager         |
| `/invite/[token]` | Accept invite             |

**Missing (referenced in code):** `/dashboard/settings`, `/dashboard/settings/members`, analytics, contacts, notifications.

### API Endpoints

**Public widget** (`/api/widget/[publicKey]/`):
`config`, `session`, `chat`, `message`, `history`, `feedback`, `upload`, `documents`, `identify`, `lead-capture/detect`, `lead-capture/submit`

**Dashboard** (`/api/dashboard/`):
`widget`, `widget/sessions`, `conversations`, `knowledge-base/*`, `integrations`, `workspaces`, `me`

**Other:** `/api/analytics/widget`, `/api/files/[...storageKey]`, `/api/auth/[...all]`

---

## 1.5 Current Gaps Summary

| Area         | What works                          | What's missing                                  |
| ------------ | ----------------------------------- | ----------------------------------------------- |
| Widget       | Embed, chat, lead capture, preview  | AI settings UI, templates, standalone page      |
| Leads        | Basic capture and list              | Scoring, qualification, assignment, detail page |
| Knowledge    | File upload, single URL             | Crawling, connectors, sync, monitoring          |
| Integrations | UI cards, status toggle             | OAuth, real execution, agent tools              |
| Inbox        | View conversations, escalation      | Team reply, assignment UI, real-time            |
| AI           | OpenAI + Gemini streaming           | OpenRouter, model picker in UI                  |
| Platform     | Workflows, events, notifications DB | Notifications UI, settings pages, billing       |
| SDK stack    | AI SDK (chat)                       | Queue SDK, Workflow SDK, Chat SDK               |

---

## 1.6 Vercel SDK Stack — Current Usage

Widget is built on the Vercel ecosystem. Four SDKs form the planned full stack; only **AI SDK** is integrated today.

### SDK overview

| SDK                                             | Docs                                                | Purpose in Widget                                       | Status                   |
| ----------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------- | ------------------------ |
| [AI SDK](https://ai-sdk.dev/)                   | [ai-sdk.dev](https://ai-sdk.dev/)                   | Streaming chat and future tool calling                  | ✅ In use                |
| [Workflow SDK](https://workflow-sdk.dev/)       | [workflow-sdk.dev](https://workflow-sdk.dev/)       | Durable document sync, lead follow-ups, AI agent runs   | ❌ Custom DB runner only |
| [Queue SDK](https://vercel.com/docs/queues/sdk) | [Vercel Queues](https://vercel.com/docs/queues/sdk) | Async background jobs (crawl, index, notify, score)     | ❌ Not integrated        |
| [Chat SDK](https://chat-sdk.dev/)               | [chat-sdk.dev](https://chat-sdk.dev/)               | Slack, WhatsApp, Teams adapters for multi-channel inbox | ❌ Not integrated        |

### How they fit together (target architecture)

```text
                    ┌─────────────────────────────────────────┐
                    │           Widget Platform               │
                    └─────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
  ┌───────────┐               ┌───────────────┐              ┌─────────────┐
  │  AI SDK   │               │ Workflow SDK  │              │  Queue SDK  │
  │           │               │               │              │             │
  │ streamText│◄──────────────│ durable steps │◄─────────────│ send/handle │
  │ tools     │               │ sleep/resume  │              │ retries     │
  │ tools     │               │ observability │              │ delay jobs  │
  └─────┬─────┘               └───────┬───────┘              └──────┬──────┘
        │                             │                             │
        │                     long-running flows                      │
        │              (crawl → extract → AI Search index)            │
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │   Chat SDK    │
                              │               │
                              │ Slack adapter │
                              │ WhatsApp      │
                              │ Teams         │
                              └───────────────┘
```

---

### AI SDK ✅ (In use today)

**Package:** `ai` v6, `@ai-sdk/openai`, `@ai-sdk/google`  
**Docs:** [ai-sdk.dev](https://ai-sdk.dev/)

| Capability               | Used for                       | File                                         |
| ------------------------ | ------------------------------ | -------------------------------------------- |
| `streamText`             | Widget chat streaming with RAG | `src/features/widget/server/widget-agent.ts` |
| `convertToModelMessages` | Message format conversion      | `src/features/widget/server/widget-agent.ts` |
| Provider factories       | OpenAI + Google model routing  | `src/lib/ai/providers.ts`                    |

**Not yet used from AI SDK:**

- `tool` / tool calling (needed for AI Actions — 2.4)
- `generateObject` (needed for lead qualification scoring — 2.1)
- AI SDK UI hooks (dashboard could adopt for playground — 2.2)
- Multi-provider fallbacks via [AI Gateway](https://ai-sdk.dev/) or OpenRouter

---

### Workflow SDK ❌ (Custom replacement exists)

**Package:** `workflow` (not installed)  
**Docs:** [workflow-sdk.dev](https://workflow-sdk.dev/)

**Current workaround:** Custom `WorkflowRun` model + `src/lib/workflows/runner.ts` tracks start/complete/fail in the database. Used for document processing only.

| Custom runner           | Workflow SDK equivalent                   |
| ----------------------- | ----------------------------------------- |
| `startWorkflowRun()`    | `"use workflow"` function start           |
| `completeWorkflowRun()` | workflow completes successfully           |
| `failWorkflowRun()`     | step retry + fatal error handling         |
| `maxAttempts` in DB     | built-in retry policies                   |
| No suspend/resume       | `sleep("7 days")` for WhatsApp follow-ups |

**Limitation:** Custom runner cannot suspend across days, survive serverless timeouts, or provide step-level observability out of the box.

---

### Queue SDK ❌ (Not integrated)

**Package:** `@vercel/queue` (not installed)  
**Docs:** [vercel.com/docs/queues/sdk](https://vercel.com/docs/queues/sdk)

**Current behavior:** Document processing runs inline in the API request path via `processDocument()`. No message queue.

**Planned use cases:**

| Topic               | Payload                       | Trigger                             |
| ------------------- | ----------------------------- | ----------------------------------- |
| `document.process`  | `{ documentId, workspaceId }` | File upload or source sync          |
| `source.sync`       | `{ dataSourceId }`            | Manual sync or scheduled crawl      |
| `lead.qualify`      | `{ leadId }`                  | After lead capture                  |
| `notification.send` | `{ type, userId, channels }`  | Assignment, escalation              |
| `whatsapp.followup` | `{ leadId, ruleId }`          | Automation rule with `delaySeconds` |

---

### Chat SDK ❌ (Not integrated)

**Package:** `chat`, `@chat-adapter/slack`, etc. (not installed)  
**Docs:** [chat-sdk.dev](https://chat-sdk.dev/)

**Current behavior:** Widget embed handles web chat only. Slack/WhatsApp integrations are UI stubs with simulated actions.

**Planned use cases:**

| Adapter        | Feature                               | Handler                           |
| -------------- | ------------------------------------- | --------------------------------- |
| Slack          | Team notifications, escalation alerts | `bot.onNewMention`, channel posts |
| WhatsApp       | Lead follow-up conversations          | incoming webhook → thread         |
| (future) Teams | Enterprise customers                  | same Chat SDK pattern             |

Chat SDK integrates directly with AI SDK — agent streams responses into platform threads:

```typescript
bot.onSubscribedMessage(async (thread, msg) => {
  const result = await agent.stream({ prompt: msg.text });
  await thread.post(result.fullStream);
});
```

---

## 1.7 Current File Reference

| Area              | Key Paths                                                               |
| ----------------- | ----------------------------------------------------------------------- |
| Widget embed      | `public/widget/`, `scripts/build-widget.js`                             |
| Widget agent      | `src/features/widget/server/widget-agent.ts`                            |
| Widget config     | `src/components/widget/widget-customizer.tsx`                           |
| Widget APIs       | `src/app/api/widget/[publicKey]/`                                       |
| Conversations     | `src/features/conversations/server/`                                    |
| Leads             | `src/features/leads/server/lead-service.ts`                             |
| Knowledge         | `src/features/knowledge/`                                               |
| Integrations      | `src/lib/integrations/`, `src/features/integrations/`                   |
| AI SDK            | `src/lib/ai/providers.ts`, `src/features/widget/server/widget-agent.ts` |
| Workflow (custom) | `src/lib/workflows/runner.ts`                                           |
| Auth              | `src/lib/auth/server.ts`                                                |
| Schema            | `src/lib/db/schema.ts`                                                  |
| Env vars          | `.env.example`                                                          |

---

# Part II — Future Implementations

All planned features with technical design. Each builds on the current structure described in Part I.

---

## 2.1 Lead Qualification System

**Goal:** Capture company details and automatically qualify, score, and categorize leads by business size, industry, and use case.

### What will be built

| Component        | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| Company fields   | `companyName`, `companySize`, `industry`, `useCase` on leads |
| AI scoring       | 0–100 score based on size, industry, use case, engagement    |
| Categories       | `hot`, `warm`, `cold`, `unqualified`                         |
| Lead detail page | Score, reasoning, filters, bulk actions                      |
| Workspace config | Customizable scoring weights and thresholds                  |

### Schema changes

```ts
model Lead {
  // ... existing fields ...
  companyName       String?
  companySize       String?     // "1-10", "11-50", "51-200", "201-1000", "1000+"
  industry          String?
  useCase           String?
  score             Int         @default(0)
  category          String?     // "hot", "warm", "cold", "unqualified"
  qualificationData String      @default("{}")  // JSON: AI reasoning
  assignedMemberId  String?
  assignedMember    WorkspaceMember? @relation(...)
}
```

### Flow

```text
Lead captured
  → AI analyzes conversation + fields
  → Optional company enrichment
  → Score (0–100) + category assigned
  → Routing rules applied (see 2.6)
  → Dashboard shows scored leads with filters
```

**Depends on:** 2.6 Lead Assignment, OpenRouter (optional for cost-effective scoring)

---

## 2.2 Playground Testing

**Goal:** Test chatbot responses before publishing changes to the live widget.

### What will be built

| Component              | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `/playground` route    | Standalone testing page                              |
| Draft/publish workflow | Edit draft → test → publish to live                  |
| Debug panel            | View retrieved chunks and system prompt per response |
| Sandbox mode           | Test lead capture, escalation, AI actions safely     |
| Team sharing           | Share playground link for review                     |

### Schema changes

```ts
model Widget {
  // ... existing fields ...
  draftConfig     String?     // JSON: full draft configuration
  publishedAt     DateTime?
  draftUpdatedAt  DateTime?
}
```

### Flow

```text
Edit config → saved as draft
  → Playground tests against draft
  → "Publish" → draft becomes live
  → Live widget serves published config only
```

**Builds on:** Existing `WidgetLiveWidgetPreview` and `preview: true` chat mode.

---

## 2.3 Widget Page — Custom & Template Widgets

**Goal:** Create custom widgets or start from predefined templates.

### What will be built

| Component            | Description                              |
| -------------------- | ---------------------------------------- |
| Template gallery     | 5 predefined templates with previews     |
| Multi-widget support | Multiple widgets per workspace           |
| Widget list view     | Manage, customize, embed per widget      |
| Template picker      | "Start from template" or "Custom widget" |

### Predefined templates

| Template   | Use case           | Defaults                                   |
| ---------- | ------------------ | ------------------------------------------ |
| Support    | Customer support   | Green theme, escalation, knowledge-focused |
| Sales      | Lead generation    | Blue theme, aggressive capture, scoring    |
| FAQ        | Simple Q&A         | Minimal UI, suggestions, no capture        |
| Booking    | Scheduling         | Calendar integration, booking actions      |
| Onboarding | Product onboarding | Step suggestions, brochure enabled         |

### Schema changes

```ts
model WidgetTemplate {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String
  category    String
  config      String   // JSON: default configuration
  previewUrl  String?
  isPublic    Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model Widget {
  // Remove: workspaceId @unique
  // Add:
  name           String   @default("Default Widget")
  templateId     String?
  isDefault      Boolean  @default(false)
  deploymentMode String   @default("EMBED")
}
```

---

## 2.4 AI Actions

**Goal:** Let AI agents execute actions during conversations — booking, CRM updates, API calls, ticket creation, workflow automation.

### What will be built

| Action             | Integration        | Trigger                    |
| ------------------ | ------------------ | -------------------------- |
| Book meeting       | Google Calendar    | Scheduling intent detected |
| Send email         | Gmail              | Follow-up needed           |
| Create lead        | Internal           | Contact captured in chat   |
| Update CRM         | HubSpot/Salesforce | Contact/deal update        |
| Create ticket      | Internal (2.8)     | Support issue detected     |
| Slack notification | Slack              | Escalation or lead alert   |
| Custom API call    | Webhook            | Configurable per workspace |
| Run workflow       | Internal           | Multi-step automation      |

### Architecture

```text
User message
  → widget-agent.ts (streamText with tools)
  → AI calls a tool
  → Tool handler validates + executes
  → executeIntegrationAction (real, not simulated)
  → Result streamed to user
  → IntegrationAction logged
```

### Schema changes

```ts
model Widget {
  // ... existing fields ...
  enabledActions String @default("[]")  // JSON: ["book_meeting", "create_lead"]
}
```

**Prerequisites:** Real OAuth (Gmail, Calendar, Slack), wire tools into `widget-agent.ts`, user confirmation for destructive actions.

---

## 2.5 GPT Chat & Widget Deployment

**Goal:** Two deployment modes — standalone ChatGPT-style page and embeddable widget — with separate branding while sharing the same AI agent and knowledge base.

### What will be built

| Mode       | Description                 | URL                                |
| ---------- | --------------------------- | ---------------------------------- |
| Embed      | JS snippet on customer site | `widget.bundle.js?key=PUBLIC_KEY`  |
| Standalone | Full-page chat              | `/chat/[publicKey]` or custom slug |

**Shared:** AI agent, knowledge base, lead capture, AI actions  
**Separate:** Branding, sharing settings, analytics, authorized domains (embed only)

### Schema changes

```ts
model Widget {
  deploymentMode          String  @default("EMBED")
  standaloneTitle         String?
  standaloneDescription   String?
  standaloneLogoUrl       String?
  standaloneFaviconUrl    String?
  standaloneCustomCss     String?
  standalonePublicAccess  Boolean @default(true)
  standalonePassword      String?
  standaloneCustomSlug    String? @unique
}
```

**New route:** `src/app/chat/[publicKey]/page.tsx` — full-screen, mobile-responsive, optional password gate.

---

## 2.6 Lead Assignment & Notifications

**Goal:** Auto-assign leads to team members and notify via Slack, email, WhatsApp, and in-app alerts using routing rules and lead scores.

### What will be built

| Component             | Description                                |
| --------------------- | ------------------------------------------ |
| Routing rules engine  | Priority-based rules with conditions       |
| Assignment methods    | Specific member, round-robin, least-loaded |
| Notification channels | In-app, email, Slack, WhatsApp             |
| `/notifications` page | Notifications inbox                        |
| Workload view         | Team member assignment balance             |

### Schema changes

```ts
model RoutingRule {
  id             String   @id @default(cuid())
  workspaceId    String
  name           String
  priority       Int      @default(0)
  isActive       Boolean  @default(true)
  conditions     String   // JSON: scoreMin, scoreMax, category, industry, source
  assignToId     String?
  assignMethod   String   @default("specific")
  notifyChannels String   @default("[]")
  createdAt      DateTime @default(now())
  workspace      Workspace @relation(...)
  assignTo       WorkspaceMember? @relation(...)
}
```

### Flow

```text
Lead qualified → rules evaluated (priority order)
  → First match assigns to team member
  → Notifications sent (in-app, Slack, email, WhatsApp)
  → Dashboard shows assignment + history
```

**Builds on:** Existing `Notification` model and `WorkspaceMember` roles.

---

## 2.7 WhatsApp Lead Follow-Up Automation

**Goal:** Auto-initiate and continue conversations with leads via WhatsApp — follow-ups, qualification, booking, ongoing engagement.

### What will be built

| Component             | Description                                   |
| --------------------- | --------------------------------------------- |
| WhatsApp Business API | Meta Cloud API integration                    |
| Automation rules      | Triggered follow-ups with configurable delays |
| Multi-channel inbox   | Widget + WhatsApp conversations unified       |
| Message templates     | Pre-approved WhatsApp templates               |
| Webhook handler       | Incoming message processing                   |

### Schema changes

```ts
model WhatsAppConfig {
  id                 String   @id @default(cuid())
  workspaceId        String   @unique
  phoneNumberId      String
  businessAccountId  String
  accessToken        String   // encrypted
  webhookVerifyToken String
  isActive           Boolean  @default(false)
  workspace          Workspace @relation(...)
}

model AutomationRule {
  id              String   @id @default(cuid())
  workspaceId     String
  name            String
  trigger         String   // "lead_captured", "lead_qualified", etc.
  delay           Int      @default(0)
  channel         String   @default("whatsapp")
  messageTemplate String
  followUpRules   String   @default("[]")
  isActive        Boolean  @default(true)
  workspace       Workspace @relation(...)
}
```

**Depends on:** 2.1 Qualification, 2.4 AI Actions, 2.6 Notifications

---

## 2.8 Ticket Management System

**Goal:** Create, view, track, and manage support tickets from the widget with status, comments, attachments, and assignment.

### What will be built

| Component            | Description                                             |
| -------------------- | ------------------------------------------------------- |
| Ticket CRUD          | Create, update, close tickets                           |
| Creation paths       | AI agent, visitor button, agent manual, escalation auto |
| Widget integration   | Status in chat, visitor comments/attachments            |
| Dashboard `/tickets` | List, filters, detail, optional Kanban                  |
| AI action            | `create_ticket` tool in widget agent                    |

### Schema changes

```ts
model Ticket {
  id               String   @id @default(cuid())
  workspaceId      String
  ticketNumber     Int
  subject          String
  description      String
  status           String   @default("open")
  priority         String   @default("medium")
  category         String?
  contactId        String?
  conversationId   String?
  assignedMemberId String?
  createdBy        String   @default("ai")
  resolvedAt       DateTime?
  closedAt         DateTime?
  workspace        Workspace @relation(...)
  comments         TicketComment[]
  attachments      TicketAttachment[]
}

model TicketComment {
  id         String @id @default(cuid())
  ticketId   String
  body       String
  authorType String  // "agent", "visitor", "ai", "system"
  isInternal Boolean @default(false)
  ticket     Ticket @relation(...)
}

model TicketAttachment {
  id         String @id @default(cuid())
  ticketId   String
  filename   String
  storageKey String
  ticket     Ticket @relation(...)
}
```

---

## 2.9 Data Sources Management

**Goal:** Centralized system to train AI from websites, documents, text, Q&A, API endpoints, Notion, Google Drive, GitHub, and help centers — with sync, indexing, and monitoring.

### What will be built

| Source type      | Method                  | Sync               |
| ---------------- | ----------------------- | ------------------ |
| Website          | **Firecrawl** crawl API | Scheduled re-crawl |
| PDF / DOCX / TXT | File upload             | Manual             |
| Text snippet     | Direct input            | Manual edit        |
| Q&A pair         | Structured input        | Manual edit        |
| API endpoint     | HTTP fetch              | Scheduled refresh  |
| Notion           | Notion API              | Scheduled sync     |
| Google Drive     | Drive API               | Scheduled sync     |
| GitHub           | GitHub API              | Scheduled sync     |
| Help center      | Firecrawl crawl         | Scheduled re-crawl |

### Schema changes

```ts
model DataSource {
  id            String   @id @default(cuid())
  workspaceId   String
  name          String
  type          String
  config        String   @default("{}")
  status        String   @default("active")
  lastSyncAt    DateTime?
  lastSyncError String?
  syncInterval  Int?
  documentCount Int      @default(0)
  chunkCount    Int      @default(0)
  workspace     Workspace @relation(...)
  documents     Document[]
}

model QAPair {
  id           String @id @default(cuid())
  workspaceId  String
  dataSourceId String?
  question     String
  answer       String
  workspace    Workspace @relation(...)
}
```

### Firecrawl integration

```typescript
// src/features/knowledge/server/firecrawl.ts
const firecrawl = new Firecrawl({ apiKey: env.FIRECRAWL_API_KEY });
const result = await firecrawl.crawl(url, {
  limit: maxPages ?? 100,
  scrapeOptions: { formats: ["markdown"] },
});
```

### Sync workflow

```text
Source created → WorkflowRun started
  → Fetcher runs (Firecrawl / Notion / Drive / GitHub / API)
  → Extract → chunk locally → upload to AI Search
  → Documents created/updated (dedup by externalId)
  → Stats updated, WorkflowRun completed
```

**Replaces:** Current `/knowledge-base` page → `/data-sources`

---

## 2.10 External Services

### Firecrawl — Website Crawling

**Pricing:** [firecrawl.dev/pricing](https://www.firecrawl.dev/pricing)

| Plan     | Cost    | Credits | Pages   |
| -------- | ------- | ------- | ------- |
| Free     | $0      | 1,000   | 1,000   |
| Hobby    | $16/mo  | 5,000   | 5,000   |
| Standard | $83/mo  | 100,000 | 100,000 |
| Growth   | $333/mo | 500,000 | 500,000 |

- 1 credit per page crawled
- Package: `@mendable/firecrawl-js`
- Env: `FIRECRAWL_API_KEY`
- **Recommended:** Hobby for dev, Standard for production

### OpenRouter — Multi-Model AI

**Pricing:** [openrouter.ai/pricing](https://openrouter.ai/pricing)

| Plan          | Fee               | Models                 |
| ------------- | ----------------- | ---------------------- |
| Free          | N/A               | 25+ models, 50 req/day |
| Pay-as-you-go | 5.5% platform fee | 400+ models            |
| Enterprise    | Custom            | 400+ models            |

- No markup on provider pricing
- Failed attempts not billed
- Env: `OPENROUTER_API_KEY`
- **Use cases:** Chat model selection, lead scoring, fallback routing
- **Keep direct:** OpenAI for default chat unless routing is moved behind OpenRouter

---

## 2.11 Vercel SDK Stack — Planned Integration

Full adoption of the Vercel SDK ecosystem across all planned features. Each SDK maps to specific product capabilities.

### SDK → Feature mapping

| SDK          | Planned features                                                    | Phase |
| ------------ | ------------------------------------------------------------------- | ----- |
| AI SDK       | Chat, RAG, tool calling, lead scoring, qualification                | 1–2   |
| Queue SDK    | Document processing, source sync, notifications, delayed follow-ups | 1–2   |
| Workflow SDK | Multi-step crawls, WhatsApp drip campaigns, durable AI agents       | 2–3   |
| Chat SDK     | Slack notifications, WhatsApp conversations, Teams (future)         | 2–3   |

---

### AI SDK — Expand usage

**Docs:** [ai-sdk.dev](https://ai-sdk.dev/)  
**Install:** `pnpm add ai` (already installed)

#### Phase 1 additions

| API                                        | Use case                                  | Feature |
| ------------------------------------------ | ----------------------------------------- | ------- |
| OpenRouter via `createOpenAI({ baseURL })` | Multi-model selection                     | 2.10    |
| Provider fallbacks                         | Primary model fails → retry cheaper model | 2.10    |

#### Phase 2 additions

| API                           | Use case                                       | Feature  |
| ----------------------------- | ---------------------------------------------- | -------- |
| `tools` in `streamText`       | Book meeting, create ticket, send email        | 2.4      |
| `generateObject` + Zod schema | Lead score + category output                   | 2.1      |
| `maxSteps`                    | Multi-step agent (research → qualify → assign) | 2.1, 2.4 |

#### Example: Lead qualification with `generateObject`

```typescript
import { generateObject } from "ai";
import { z } from "zod";

const { object } = await generateObject({
  model: getWidgetModel(provider, modelName),
  schema: z.object({
    score: z.number().min(0).max(100),
    category: z.enum(["hot", "warm", "cold", "unqualified"]),
    companySize: z.string().optional(),
    industry: z.string().optional(),
    reasoning: z.string(),
  }),
  prompt: `Qualify this lead based on conversation:\n${conversationSummary}`,
});
```

#### Example: AI Actions with tools

```typescript
import { streamText, tool } from "ai";

return streamText({
  model: getWidgetModel(config.modelProvider, config.modelName),
  tools: {
    bookMeeting: tool({
      description: "Book a meeting on Google Calendar",
      parameters: z.object({ title: z.string(), datetime: z.string(), email: z.string() }),
      execute: async (params) =>
        executeIntegrationAction({ ...params, actionType: "create_event" }),
    }),
    createTicket: tool({
      description: "Create a support ticket",
      parameters: z.object({ subject: z.string(), description: z.string() }),
      execute: async (params) => createTicketFromAgent({ ...params, workspaceId }),
    }),
  },
  maxSteps: 5,
  // ...
});
```

---

### Queue SDK — Background job processing

**Docs:** [vercel.com/docs/queues/sdk](https://vercel.com/docs/queues/sdk)  
**Install:** `pnpm add @vercel/queue`

Replaces inline `processDocument()` calls with durable, retriable async workers.

#### Architecture

```text
API route (upload / sync / lead capture)
  → send("topic", payload, { idempotencyKey, delaySeconds })
  → Queue worker (handleCallback)
  → Process job → update DB → emit DomainEvent
```

#### Queue topics

| Topic                   | Producer                 | Consumer handler                   | Feature |
| ----------------------- | ------------------------ | ---------------------------------- | ------- |
| `document.process`      | Knowledge upload API     | Extract → chunk → AI Search index  | 2.9     |
| `source.sync`           | Data Sources page / cron | Firecrawl crawl or connector fetch | 2.9     |
| `lead.qualify`          | Lead capture submit      | AI SDK `generateObject` scoring    | 2.1     |
| `notification.dispatch` | Routing rules engine     | Slack, email, in-app delivery      | 2.6     |
| `whatsapp.send`         | Automation rules         | Chat SDK WhatsApp adapter          | 2.7     |

#### Example: Publish on document upload

```typescript
// src/app/api/dashboard/knowledge-base/upload/route.ts
import { send } from "@vercel/queue";

await send(
  "document.process",
  { documentId, workspaceId },
  {
    idempotencyKey: `doc-${documentId}`,
  },
);
```

#### Example: Consumer handler

```typescript
// src/app/api/queues/document-process/route.ts
import { handleCallback } from "@vercel/queue";

export const POST = handleCallback(
  async (message, metadata) => {
    await processDocument({ db, ...message });
  },
  {
    retry: (error, metadata) => {
      if (metadata.deliveryCount > 3) return { acknowledge: true };
      return { afterSeconds: 2 ** metadata.deliveryCount * 5 };
    },
  },
);
```

#### `vercel.json` consumer config

```json
{
  "functions": {
    "src/app/api/queues/document-process/route.ts": {
      "experimentalTriggers": [{ "type": "queue/v2beta", "topic": "document.process" }]
    }
  }
}
```

---

### Workflow SDK — Durable multi-step flows

**Docs:** [workflow-sdk.dev](https://workflow-sdk.dev/)  
**Install:** `pnpm add workflow`

Replaces custom `WorkflowRun` DB runner for flows that need suspend, resume, sleep, and serverless-timeout survival.

#### When to use Workflow SDK vs Queue SDK

| Use Queue SDK                     | Use Workflow SDK                               |
| --------------------------------- | ---------------------------------------------- |
| Single-step async job             | Multi-step orchestration                       |
| Fire-and-forget processing        | Needs `sleep("7 days")` between steps          |
| Simple retry on failure           | Human-in-the-loop approval                     |
| Document index, send notification | WhatsApp drip campaign, crawl → index pipeline |

#### Planned workflows

| Workflow             | Steps                                                       | Feature       |
| -------------------- | ----------------------------------------------------------- | ------------- |
| `documentPipeline`   | fetch → extract → chunk → AI Search index                   | 2.9           |
| `sourceSyncPipeline` | crawl site → dedup pages → index each → update stats        | 2.9           |
| `leadFollowUp`       | qualify → assign → notify → sleep 3 days → WhatsApp message | 2.1, 2.6, 2.7 |
| `aiAgentRun`         | stream response → tool calls → persist result               | 2.4           |

#### Example: Data source sync workflow

```typescript
import { sleep } from "workflow";

export async function sourceSyncPipeline(dataSourceId: string) {
  "use workflow";

  const pages = await crawlWithFirecrawl(dataSourceId);
  await indexPages(pages);
  await updateSourceStats(dataSourceId);

  return { pageCount: pages.length };
}

async function crawlWithFirecrawl(dataSourceId: string) {
  "use step";
  // Firecrawl API call — retried automatically on failure
}

async function indexPages(pages: Page[]) {
  "use step";
  // Extract text + upload to Cloudflare AI Search
}
```

#### Example: WhatsApp follow-up with sleep

```typescript
export async function leadFollowUp(leadId: string) {
  "use workflow";

  const lead = await qualifyLead(leadId);
  await assignAndNotify(lead);
  await sleep("3 days");
  await sendWhatsAppFollowUp(leadId, "checking in...");
  await sleep("7 days");
  await sendWhatsAppFollowUp(leadId, "still interested?");
}
```

#### Migration from custom `WorkflowRun`

| Current (`src/lib/workflows/runner.ts`)    | Workflow SDK                     |
| ------------------------------------------ | -------------------------------- |
| `WorkflowRun` Drizzle table                | Workflow observability dashboard |
| `startWorkflowRun` / `completeWorkflowRun` | `"use workflow"` + `"use step"`  |
| Manual `maxAttempts`                       | Built-in step retries            |
| No cross-request suspend                   | `sleep()`, hooks, webhooks       |

Keep `DomainEvent` emission inside workflow steps for dashboard audit trail.

---

### Chat SDK — Multi-channel messaging

**Docs:** [chat-sdk.dev](https://chat-sdk.dev/)  
**Install:** `pnpm add chat @chat-adapter/slack` (+ WhatsApp adapter when available)

Unified API for Slack, WhatsApp, Teams, and future channels. One agent codebase, multiple platforms.

#### Architecture

```text
src/lib/chat/
  ├── bot.ts              # Chat instance + event handlers
  ├── adapters/
  │   ├── slack.ts        # createSlackAdapter()
  │   └── whatsapp.ts     # WhatsApp Business adapter
  └── agent-bridge.ts     # Connects Chat SDK threads → AI SDK agent
```

#### Slack integration (notifications + escalation)

```typescript
import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";

export const slackBot = new Chat({
  userName: "widget",
  adapters: { slack: createSlackAdapter() },
});

// Escalation alert to team channel
export async function notifySlackEscalation(channelId: string, conversationId: string) {
  const thread = await slackBot.getThread(channelId);
  await thread.post(`🚨 Conversation escalated: ${conversationId}`);
}
```

#### WhatsApp integration (lead follow-up)

```typescript
bot.onSubscribedMessage(async (thread, message) => {
  const result = await streamWidgetAgent({
    config: await getWidgetConfigForChannel("WHATSAPP"),
    messages: [{ role: "user", content: message.text }],
    // ...
  });
  await thread.post(result.fullStream);
});
```

#### Chat SDK + AI SDK + Workflow SDK together

```text
Lead captured (widget)
  → Queue: send("lead.qualify", { leadId })
  → Workflow: qualify → assign → sleep("1 day")
  → Chat SDK: WhatsApp thread.post(AI agent stream)
  → AI SDK: streamText with tools (book meeting, create ticket)
```

#### Feature mapping

| Chat SDK capability    | Widget feature                          |
| ---------------------- | --------------------------------------- | -------- |
| `onNewMention`         | Slack escalation alerts                 | 2.6      |
| `onSubscribedMessage`  | WhatsApp lead conversations             | 2.7      |
| `thread.post(stream)`  | AI streaming into any channel           | 2.4, 2.7 |
| JSX Cards              | Rich ticket/lead notifications in Slack | 2.8      |
| State adapters (Redis) | Thread subscription persistence         | 2.7      |

---

### Combined SDK stack diagram

```text
Visitor (widget embed / WhatsApp / Slack)
        │
        ▼
┌───────────────────┐     ┌─────────────────┐
│     Chat SDK      │────►│     AI SDK      │
│  (multi-channel)  │     │ streamText/tools│
└─────────┬─────────┘     └────────┬────────┘
          │                          │
          │                ┌─────────▼─────────┐
          │                │   Workflow SDK    │
          │                │ qualify → sleep   │
          │                │ → follow-up       │
          │                └─────────┬─────────┘
          │                          │
          ▼                          ▼
┌─────────────────────────────────────────────┐
│              Queue SDK                       │
│  document.process │ source.sync │ lead.*    │
└─────────────────────────────────────────────┘
          │
          ▼
   Drizzle (D1) + R2 + AI Search
```

---

# Part III — Planning & Roadmap

How and when to build everything.

---

## 3.1 Feature Status Matrix

| #   | Feature                         | Current                | Target                        | Phase |
| --- | ------------------------------- | ---------------------- | ----------------------------- | ----- |
| 1   | Lead Qualification              | Basic capture          | AI scoring + categorization   | 2     |
| 2   | Playground                      | Live preview only      | Draft/publish + debug panel   | 2     |
| 3   | Widget Templates                | One widget, customizer | Templates + multi-widget      | 2–4   |
| 4   | AI Actions                      | Simulated integrations | Real OAuth + agent tools      | 2–3   |
| 5   | Dual Deployment                 | Embed only             | Embed + standalone chat page  | 2     |
| 6   | Lead Assignment & Notifications | DB notifications only  | Rules + multi-channel alerts  | 2     |
| 7   | WhatsApp Automation             | Not started            | Business API + follow-ups     | 3     |
| 8   | Ticket Management               | Not started            | Full ticket lifecycle         | 2     |
| 9   | Data Sources                    | Files + single URL     | Multi-source + Firecrawl sync | 1     |

### Vercel SDK adoption status

| SDK                                             | Current                 | Target                                      | Phase |
| ----------------------------------------------- | ----------------------- | ------------------------------------------- | ----- |
| [AI SDK](https://ai-sdk.dev/)                   | `streamText`            | + tools, `generateObject`, OpenRouter       | 1–2   |
| [Queue SDK](https://vercel.com/docs/queues/sdk) | Not installed           | Background jobs for process/sync/notify     | 1–2   |
| [Workflow SDK](https://workflow-sdk.dev/)       | Custom `WorkflowRun` DB | Durable multi-step flows, sleep, follow-ups | 2–3   |
| [Chat SDK](https://chat-sdk.dev/)               | Not installed           | Slack + WhatsApp multi-channel              | 2–3   |

---

## 3.2 Database Evolution Plan

### New models

| Model                                         | Feature             | Phase |
| --------------------------------------------- | ------------------- | ----- |
| `DataSource`                                  | Data Sources        | 1     |
| `QAPair`                                      | Data Sources        | 1     |
| `WidgetTemplate`                              | Widget Templates    | 2     |
| `RoutingRule`                                 | Lead Assignment     | 2     |
| `Ticket`, `TicketComment`, `TicketAttachment` | Tickets             | 2     |
| `WhatsAppConfig`                              | WhatsApp            | 3     |
| `AutomationRule`                              | WhatsApp Automation | 3     |

### Existing model extensions

| Model          | New fields                                                            | Feature      |
| -------------- | --------------------------------------------------------------------- | ------------ |
| `Lead`         | company, score, category, assignedMemberId                            | 2.1, 2.6     |
| `Widget`       | draftConfig, deploymentMode, standalone\*, enabledActions, templateId | 2.2–2.5, 2.3 |
| `Document`     | dataSourceId, externalId, lastSyncedAt                                | 2.9          |
| `Conversation` | channel: `WHATSAPP`                                                   | 2.7          |

---

## 3.3 Implementation Phases

### Phase 1 — Foundation

**Goal:** Close core gaps, add crawling and multi-model support.

| Task                                                     | Feature    | Effort |
| -------------------------------------------------------- | ---------- | ------ |
| Expose AI settings in widget customizer                  | Existing   | Small  |
| Build settings & members pages                           | Existing   | Small  |
| Notifications inbox page                                 | 2.6        | Small  |
| Firecrawl integration                                    | 2.9        | Medium |
| Data Sources page                                        | 2.9        | Medium |
| Q&A pair + text snippet sources                          | 2.9        | Small  |
| OpenRouter provider (AI SDK)                             | 2.10, 2.11 | Medium |
| Model selection in dashboard                             | 2.10       | Small  |
| **Queue SDK:** `document.process` + `source.sync` topics | 2.11       | Medium |
| **Queue SDK:** Move `processDocument` off request path   | 2.11       | Medium |

**New packages:** `@vercel/queue`

**New files:**

- `src/features/knowledge/server/firecrawl.ts`
- `src/lib/ai/openrouter.ts`
- `src/app/(dashboard)/data-sources/page.tsx`
- `src/features/knowledge/server/data-source-service.ts`
- `src/app/api/queues/document-process/route.ts`
- `src/app/api/queues/source-sync/route.ts`
- `src/lib/queue/topics.ts`

---

### Phase 2 — Intelligence & Workflow

**Goal:** Lead qualification, tickets, playground, real integrations, standalone chat.

| Task                                                    | Feature   | Effort |
| ------------------------------------------------------- | --------- | ------ |
| Lead qualification scoring                              | 2.1       | Medium |
| Lead detail page                                        | 2.1       | Medium |
| Playground with draft/publish                           | 2.2       | Medium |
| Widget templates (predefined)                           | 2.3       | Medium |
| Ticket model + dashboard                                | 2.8       | Large  |
| Ticket creation from widget + AI                        | 2.8, 2.4  | Medium |
| Real OAuth (Gmail, Calendar, Slack)                     | 2.4       | Large  |
| **AI SDK:** Wire `tools` into widget agent              | 2.4, 2.11 | Medium |
| **AI SDK:** `generateObject` for lead scoring           | 2.1, 2.11 | Medium |
| **Workflow SDK:** `sourceSyncPipeline` workflow         | 2.11      | Medium |
| **Workflow SDK:** `leadFollowUp` workflow               | 2.11      | Medium |
| **Queue SDK:** `lead.qualify` + `notification.dispatch` | 2.11      | Medium |
| **Chat SDK:** Slack adapter for notifications           | 2.6, 2.11 | Medium |
| Routing rules + lead assignment                         | 2.6       | Medium |
| Slack + email notifications                             | 2.6       | Medium |
| Standalone chat page                                    | 2.5       | Medium |

**New packages:** `workflow`, `chat`, `@chat-adapter/slack`

**New files:**

- `src/app/(dashboard)/playground/page.tsx`
- `src/app/(dashboard)/tickets/page.tsx`
- `src/app/chat/[publicKey]/page.tsx`
- `src/features/leads/server/qualification.ts`
- `src/features/integrations/server/tools/`
- `src/features/tickets/`
- `src/lib/chat/bot.ts`
- `src/lib/chat/adapters/slack.ts`
- `src/workflows/source-sync.ts`
- `src/workflows/lead-follow-up.ts`
- `src/app/api/queues/lead-qualify/route.ts`
- `src/app/api/queues/notification-dispatch/route.ts`

---

### Phase 3 — Multi-Channel & Automation

**Goal:** WhatsApp, external connectors, CRM, scheduled sync.

| Task                                                | Feature   | Effort |
| --------------------------------------------------- | --------- | ------ |
| WhatsApp Business API                               | 2.7       | Large  |
| **Chat SDK:** WhatsApp adapter + webhook bridge     | 2.7, 2.11 | Large  |
| **Workflow SDK:** WhatsApp drip campaigns (`sleep`) | 2.7, 2.11 | Medium |
| **Queue SDK:** `whatsapp.send` delayed messages     | 2.7, 2.11 | Medium |
| WhatsApp automation rules                           | 2.7       | Medium |
| Multi-channel unified inbox                         | 2.7       | Medium |
| Notion connector                                    | 2.9       | Medium |
| Google Drive connector                              | 2.9       | Medium |
| GitHub connector                                    | 2.9       | Medium |
| API endpoint source                                 | 2.9       | Small  |
| Scheduled sync jobs                                 | 2.9       | Medium |
| Custom API webhook actions                          | 2.4       | Medium |
| CRM integrations                                    | 2.4       | Large  |

**New files:**

- `src/app/api/webhooks/whatsapp/route.ts`
- `src/features/whatsapp/`
- `src/lib/chat/adapters/whatsapp.ts`
- `src/lib/chat/agent-bridge.ts`
- `src/workflows/whatsapp-follow-up.ts`
- `src/features/knowledge/server/connectors/notion.ts`
- `src/features/knowledge/server/connectors/gdrive.ts`

---

### Phase 4 — Scale & Enterprise

**Goal:** Multi-widget, analytics, billing, team collaboration, enterprise security.

| Task                          | Feature    | Effort |
| ----------------------------- | ---------- | ------ |
| Multi-widget per workspace    | 2.3        | Medium |
| Custom user-created templates | 2.3        | Medium |
| Kanban ticket board           | 2.8        | Medium |
| Analytics dashboard page      | Existing   | Medium |
| Billing & plan limits         | Existing   | Large  |
| Team reply from dashboard     | Existing   | Large  |
| Contacts page                 | Existing   | Medium |
| SSO & advanced security       | Enterprise | Large  |

---

## 3.4 Feature Dependencies

```text
Phase 1 (Foundation)
  ├── AI SDK: OpenRouter provider
  ├── Queue SDK: document.process, source.sync
  └── Data Sources + Firecrawl

Phase 2 (Intelligence)
  ├── AI SDK: tools + generateObject
  ├── Workflow SDK: sourceSyncPipeline, leadFollowUp
  ├── Queue SDK: lead.qualify, notification.dispatch
  ├── Chat SDK: Slack adapter
  ├── Lead Qualification (2.1) → Lead Assignment (2.6)
  ├── AI Actions (2.4) → Tickets (2.8)
  ├── Playground (2.2), Widget Templates (2.3), Standalone Chat (2.5)
  └── Tickets (2.8)

Phase 3 (Multi-Channel)
  ├── Chat SDK: WhatsApp adapter
  ├── Workflow SDK: WhatsApp drip campaigns
  ├── Queue SDK: whatsapp.send
  ├── WhatsApp (2.7)
  └── External connectors (2.9)

Phase 4 (Scale)
  └── Multi-widget, billing, team reply, enterprise
```

---

## 3.5 Cost Estimates

### Monthly operating costs (estimated)

| Service                        | Dev         | Production (10 workspaces) |
| ------------------------------ | ----------- | -------------------------- |
| Firecrawl (Hobby/Standard)     | $16         | $83                        |
| OpenRouter (pay-as-you-go)     | ~$5         | ~$50                       |
| OpenAI / Gemini chat usage     | ~$10        | ~$100                      |
| Cloudflare (D1, R2, AI Search) | $0          | ~$20                       |
| **Total**                      | **~$31/mo** | **~$253/mo**               |

### Per-workspace usage

| Action                        | Firecrawl credits | OpenRouter cost |
| ----------------------------- | ----------------- | --------------- |
| Crawl small site (50 pages)   | 50                | —               |
| Crawl medium site (500 pages) | 500               | —               |
| 1,000 chat messages           | —                 | $5–50           |
| 100 lead scores               | —                 | $0.01–0.10      |

---

## 3.6 Environment Variables

### Current

```bash
DATABASE_URL="file:./dev.db"
BETTER_AUTH_SECRET=""
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
OPENAI_API_KEY=""
GEMINI_API_KEY=""
```

### Planned npm packages by phase

| Phase | Packages                                   |
| ----- | ------------------------------------------ |
| 1     | `@vercel/queue`                            |
| 2     | `workflow`, `chat`, `@chat-adapter/slack`  |
| 3     | WhatsApp Chat SDK adapter (when available) |

### Planned (add in Phase 1–3)

```bash
# Phase 1
OPENROUTER_API_KEY=""
FIRECRAWL_API_KEY=""

# Phase 3
WHATSAPP_BUSINESS_ACCOUNT_ID=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_WEBHOOK_VERIFY_TOKEN=""
```

### Production (Cloudflare)

```bash
CLOUDFLARE_ACCOUNT_ID=""
CLOUDFLARE_API_TOKEN=""
D1_DATABASE_ID=""
R2_BUCKET_NAME=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
SEARCH_INDEX=""
```

---

## 3.7 Success Criteria by Phase

### Phase 1 complete when:

- [ ] Website crawling works via Firecrawl
- [ ] Data Sources page replaces knowledge-base
- [ ] OpenRouter models selectable in dashboard (AI SDK)
- [ ] AI settings visible in widget customizer
- [ ] Settings and members pages exist
- [ ] Queue SDK processes documents and source syncs asynchronously

### Phase 2 complete when:

- [ ] Leads are scored via AI SDK `generateObject`
- [ ] AI agent executes tools (book meeting, create ticket) via AI SDK
- [ ] Workflow SDK runs source sync and lead follow-up pipelines
- [ ] Chat SDK sends Slack escalation and assignment alerts
- [ ] Playground supports draft/publish workflow
- [ ] Tickets can be created from widget and dashboard
- [ ] Standalone chat page is live
- [ ] Routing rules assign leads and send notifications

### Phase 3 complete when:

- [ ] Chat SDK handles WhatsApp conversations end-to-end
- [ ] Workflow SDK runs WhatsApp drip campaigns with `sleep`
- [ ] Notion, Drive, GitHub sources sync on schedule
- [ ] Multi-channel inbox shows widget + WhatsApp
- [ ] CRM integration (at least one) works

### Phase 4 complete when:

- [ ] Multiple widgets per workspace
- [ ] Billing and plan limits enforced
- [ ] Team can reply to visitors from dashboard
- [ ] Analytics dashboard with full metrics

---

_Update this document as features ship. For engineering conventions and migration workflow, see [`AGENTS.md`](../AGENTS.md)._
