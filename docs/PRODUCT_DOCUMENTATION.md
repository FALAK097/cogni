# Widget Platform — Product Documentation & Roadmap

> **Last updated:** June 2026  
> **Status:** Base application in progress — core widget, AI chat, knowledge base, and lead capture are functional; advanced automation, multi-channel, and enterprise features are planned.

This document is the single source of truth for what the Widget platform does today, what is planned next, and how each major capability will be built on top of the existing codebase.

---

## Table of Contents

1. [Vision & Product Overview](#1-vision--product-overview)
2. [Current Architecture](#2-current-architecture)
3. [What Exists Today](#3-what-exists-today)
4. [Planned Features](#4-planned-features)
   - [4.1 Lead Qualification System](#41-lead-qualification-system)
   - [4.2 Playground Testing](#42-playground-testing)
   - [4.3 Widget Page — Custom & Template Widgets](#43-widget-page--custom--template-widgets)
   - [4.4 AI Actions](#44-ai-actions)
   - [4.5 GPT Chat & Widget Deployment](#45-gpt-chat--widget-deployment)
   - [4.6 Lead Assignment & Notifications](#46-lead-assignment--notifications)
   - [4.7 WhatsApp Lead Follow-Up Automation](#47-whatsapp-lead-follow-up-automation)
   - [4.8 Ticket Management System](#48-ticket-management-system)
   - [4.9 Data Sources Management](#49-data-sources-management)
5. [External Services & Cost Planning](#5-external-services--cost-planning)
6. [Database Evolution](#6-database-evolution)
7. [Implementation Phases](#7-implementation-phases)
8. [Key File Reference](#8-key-file-reference)

---

## 1. Vision & Product Overview

Widget is an AI-powered customer engagement platform. A business installs a one-line script on their website, and visitors get a branded chat assistant grounded in the company's knowledge base. The platform captures leads, escalates to humans when needed, and (in future phases) executes actions like booking meetings, updating CRMs, and sending WhatsApp follow-ups.

### High-Level Flow

```text
Customer website
  → One-line loader (widget.bundle.js)
  → Embedded widget (vanilla JS)
  → Next.js application (API + dashboard)
  → AI agent (Vercel AI SDK)
  → Knowledge retrieval (RAG)
  → Dashboard (analytics, settings, inbox, integrations)
```

### Target Capabilities (Full Vision)

| #   | Capability                                                       | Status     |
| --- | ---------------------------------------------------------------- | ---------- |
| 1   | Lead Qualification — score & categorize leads automatically      | Planned    |
| 2   | Playground — test chatbot before publishing                      | Partial    |
| 3   | Widget Templates — custom or predefined widget designs           | Partial    |
| 4   | AI Actions — booking, CRM, API calls during chat                 | Scaffolded |
| 5   | Dual Deployment — standalone GPT page + embeddable widget        | Partial    |
| 6   | Lead Assignment & Notifications — Slack, email, WhatsApp, in-app | Partial    |
| 7   | WhatsApp Follow-Up Automation                                    | Planned    |
| 8   | Ticket Management System                                         | Planned    |
| 9   | Data Sources Management — multi-source knowledge ingestion       | Partial    |

---

## 2. Current Architecture

### Tech Stack

| Layer            | Technology                                                        |
| ---------------- | ----------------------------------------------------------------- |
| Framework        | Next.js 16 (App Router), React 19, TypeScript                     |
| Styling          | Tailwind CSS v4, shadcn/ui, Base UI                               |
| Auth             | Better Auth — Google OAuth only                                   |
| Database         | Prisma 7 — SQLite locally (`dev.db`), Cloudflare D1 in production |
| State            | TanStack Query, Zustand, nuqs                                     |
| AI               | Vercel AI SDK (`ai` v6) + `@ai-sdk/openai` + `@ai-sdk/google`     |
| Embeddings       | OpenAI `text-embedding-3-small`                                   |
| Storage          | Local filesystem (dev) / Cloudflare R2 (prod)                     |
| Vector search    | Cloudflare Vectorize + Cloudflare AI Search (optional fallback)   |
| Document parsing | `pdf-parse`, `mammoth` (DOCX)                                     |
| Widget embed     | Vanilla JS bundled via esbuild → `public/widget.bundle.js`        |

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

public/widget/              # Embeddable widget source (ui, api, lead-capture)
prisma/schema.prisma        # Database schema
```

### Core Design Rules

1. **Type safety** — no `any`; strict TypeScript throughout.
2. **Stateless servers** — no in-memory state across requests.
3. **Multi-tenancy** — every query scoped to `workspaceId` via `WorkspaceMember`.
4. **JSON storage** — `Widget.authorizedDomains` and `Conversation.messages` are JSON string arrays (no separate relation tables).
5. **Google-only auth** — dashboard access via Google OAuth.

---

## 3. What Exists Today

### 3.1 Embedded Widget (Production-Ready Core)

The embeddable widget is the most complete part of the platform.

**Capabilities:**

- One-line install: `<script src=".../widget.bundle.js" data-widget-key="PUBLIC_KEY">`
- Domain allowlisting with CORS and HMAC session bootstrap
- SSE streaming AI chat with knowledge-grounded responses
- Lead capture (keyword, time, and message-count triggers)
- Brochure/document search in chat UI
- Message feedback (thumbs up/down)
- Visitor identification API
- Live preview inside the dashboard customizer

**Key files:**

- Embed source: `public/widget/`
- AI agent: `src/features/widget/server/widget-agent.ts`
- Chat API: `src/app/api/widget/[publicKey]/chat/route.ts`
- Widget service: `src/features/widget/server/widget-service.ts`
- Customizer UI: `src/components/widget/widget-customizer.tsx`

### 3.2 Widget Dashboard (Customizer)

Dashboard page at `/widget` with tabs:

| Tab          | What it configures                                             |
| ------------ | -------------------------------------------------------------- |
| General      | Display name, welcome message, placeholder                     |
| Style        | Colors, theme, position, launcher size, border radius, shadows |
| Content      | Suggestions, preview messages, branding toggle                 |
| Lead Capture | Enable/disable, keywords, time/message thresholds              |
| Embed        | Authorized domains, copy-paste embed snippet                   |

**Gap:** AI settings (instructions, model provider, escalation keywords) exist in the schema and server actions but are not exposed in the customizer UI. The `AgentSettingsForm` component exists but is not mounted.

### 3.3 Conversations / Inbox

- Visitor session-based inbox at `/conversations`
- List with search, pagination, sort; detail view with messages and visitor metadata
- Conversation statuses: `OPEN`, `ASSIGNED`, `ESCALATED`, `CLOSED`
- AI escalation on keyword match → pauses AI, creates in-app notifications
- Assignment and internal notes supported at server-action level

**Gap:** No dashboard UI to assign conversations, add notes, or reply as a team member. No real-time visitor ↔ agent messaging after handoff.

### 3.4 Leads

- Backend: detection triggers, submit, deduplication by email/phone, contact linking
- Dashboard: read-only table at `/leads` (name, email, phone, status, date)
- Widget-side conversational capture flow in `public/widget/lead-capture.js`

**Gap:** No lead detail page, status updates, scoring, assignment, or CRM export. `Lead.status` field exists but is display-only.

### 3.5 Knowledge Base

- Upload PDF, DOCX, TXT files
- Add URL sources via plain `fetch` + HTML strip (single page only)
- Chunking → embedding → Vectorize upsert → retrieval with fallbacks (vector → search → text contains)
- Dashboard UI at `/knowledge-base` to add/delete sources, view processing status

**Gap:** No site crawling (Firecrawl planned). No Notion, Google Drive, GitHub, or API endpoint sources. No sync scheduling or source health monitoring.

### 3.6 AI / LLM Integration

Current providers (direct API keys):

| Provider      | Env Var          | Default Models                       |
| ------------- | ---------------- | ------------------------------------ |
| OpenAI        | `OPENAI_API_KEY` | `gpt-5-mini`, `gpt-5.1`              |
| Google Gemini | `GEMINI_API_KEY` | `gemini-2.5-flash`, `gemini-2.5-pro` |

- Streaming via Vercel AI SDK `streamText`
- System prompt includes instructions, retrieved knowledge, contact memory, source citations
- Embeddings for RAG via OpenAI `text-embedding-3-small`

**Key files:**

- Providers: `src/lib/ai/providers.ts`
- Agent: `src/features/widget/server/widget-agent.ts`
- Embeddings: `src/lib/ai/embeddings.ts`
- Memory: `src/lib/ai/memory.ts`

**Gap:** No OpenRouter integration. Model selection not exposed in dashboard UI.

### 3.7 Integrations (Scaffolded)

Three integrations registered with UI cards at `/integrations`:

| Integration     | Category      | Status                                            |
| --------------- | ------------- | ------------------------------------------------- |
| Gmail           | Email         | Connect/disconnect toggle only; actions simulated |
| Google Calendar | Scheduling    | Connect/disconnect toggle only; actions simulated |
| Slack           | Communication | Connect/disconnect toggle only; actions simulated |

Integration categories defined for future use: CRM, Forms, Payments, Lead Sources & Files.

**Gap:** No OAuth flows. `executeIntegrationAction` returns `{ simulated: true }`. Agent tool invocation from chat is not wired.

### 3.8 Infrastructure (Ready for Extension)

| Component           | Purpose                           | File                                                 |
| ------------------- | --------------------------------- | ---------------------------------------------------- |
| `WorkflowRun`       | Durable workflow tracking         | `src/lib/workflows/runner.ts`                        |
| `DomainEvent`       | Event log for async processing    | `src/lib/events/domain-events.ts`                    |
| `Notification`      | In-app notifications (DB)         | `src/lib/notifications/create-notification.ts`       |
| `IntegrationAction` | Idempotent integration action log | `src/features/integrations/server/execute-action.ts` |

### 3.9 Dashboard Routes

| Route             | Status                                                          |
| ----------------- | --------------------------------------------------------------- |
| `/`               | Marketing landing page                                          |
| `/dashboard`      | Metrics snapshot (conversations, leads, documents, escalations) |
| `/conversations`  | Widget session inbox                                            |
| `/leads`          | Lead list (read-only)                                           |
| `/widget`         | Customizer + live preview                                       |
| `/integrations`   | Integration cards                                               |
| `/knowledge-base` | Knowledge manager                                               |
| `/invite/[token]` | Accept workspace invite                                         |

**Missing routes referenced in code:** `/dashboard/settings`, `/dashboard/settings/members`, analytics page, contacts page, notifications page.

### 3.10 API Surface

**Public widget APIs** (`/api/widget/[publicKey]/`):
`config`, `session`, `chat`, `message`, `history`, `feedback`, `upload`, `documents`, `identify`, `lead-capture/detect`, `lead-capture/submit`

**Dashboard APIs** (`/api/dashboard/`):
`widget`, `widget/sessions`, `conversations`, `knowledge-base/*`, `integrations`, `workspaces`, `me`

**Other:** `/api/analytics/widget`, `/api/files/[...storageKey]`, `/api/auth/[...all]`, `/widget.js`

---

## 4. Planned Features

### 4.1 Lead Qualification System

**Goal:** Capture company details and automatically qualify, score, and categorize leads based on business size, industry, and use case.

#### Current State

- Basic lead capture works: name, email, phone from widget chat
- `Lead` model has `status` (default `"new"`), `source`, `chatSummary`, `capturedFromChat`
- No scoring, categorization, or company enrichment fields
- Dashboard shows a flat list with no qualification data

#### Planned Implementation

**Schema additions to `Lead`:**

```prisma
model Lead {
  // ... existing fields ...
  companyName       String?
  companySize       String?     // "1-10", "11-50", "51-200", "201-1000", "1000+"
  industry          String?
  useCase           String?
  score             Int         @default(0)       // 0-100 qualification score
  category          String?     // "hot", "warm", "cold", "unqualified"
  qualificationData String      @default("{}")    // JSON: AI reasoning, signals
  assignedMemberId  String?
  assignedMember    WorkspaceMember? @relation(...)
}
```

**Qualification flow:**

```text
Lead captured (widget chat or form)
  → AI analyzes conversation context + captured fields
  → Enrichment (optional: company lookup API)
  → Score calculated (0-100) based on:
      - Company size match
      - Industry relevance
      - Use case fit
      - Engagement signals (message count, time spent)
  → Category assigned (hot/warm/cold/unqualified)
  → Routing rules applied (see 4.6)
  → Dashboard shows scored, categorized leads with filters
```

**AI scoring prompt** will run after lead submission using the widget's configured model. Scoring criteria will be configurable per workspace (industry weights, size thresholds).

**Dashboard changes:**

- Lead detail page with score, category, qualification reasoning
- Filterable/sortable lead table by score, category, industry
- Bulk actions (assign, export, change status)

**Dependencies:** Feature 4.6 (assignment), OpenRouter (optional, for cost-effective scoring with smaller models).

---

### 4.2 Playground Testing

**Goal:** Test chatbot responses before publishing changes to the live widget.

#### Current State

- `WidgetLiveWidgetPreview` component exists inside the widget customizer
- Preview mode sends chat with `preview: true` flag to the chat API
- Changes to widget config are reflected in preview after save
- No standalone playground page; no draft/publish workflow; no side-by-side comparison

#### Planned Implementation

**New route:** `/playground`

**Capabilities:**

- Chat against the current widget configuration without affecting live visitors
- Toggle between **draft** and **published** config versions
- Test with different knowledge base sources enabled/disabled
- View retrieved knowledge chunks and system prompt for each response (debug panel)
- Test lead capture triggers, escalation keywords, and AI actions in sandbox mode
- Share playground link with team members for review

**Draft/publish workflow:**

```text
User edits widget config → saved as draft
  → Playground tests against draft
  → User clicks "Publish" → draft becomes live config
  → Live widget serves published config only
```

**Schema addition to `Widget`:**

```prisma
model Widget {
  // ... existing fields ...
  draftConfig       String?     // JSON: full draft configuration
  publishedAt       DateTime?
  draftUpdatedAt    DateTime?
}
```

**Technical approach:**

- Playground uses the same `widget-agent.ts` pipeline with a `mode: "playground"` flag
- Playground conversations are stored separately (not in production inbox)
- Reuse existing SSE streaming infrastructure

---

### 4.3 Widget Page — Custom & Template Widgets

**Goal:** Allow users to create custom widgets or start from predefined templates.

#### Current State

- One widget per workspace (enforced by `workspaceId @unique` on `Widget`)
- Full customizer for appearance, content, lead capture, and embed settings
- No template system; no widget duplication; no multi-widget support

#### Planned Implementation

**Widget templates (predefined):**

| Template   | Description                     | Defaults                                             |
| ---------- | ------------------------------- | ---------------------------------------------------- |
| Support    | Customer support chatbot        | Green theme, escalation keywords, knowledge-focused  |
| Sales      | Lead generation & qualification | Blue theme, aggressive lead capture, scoring enabled |
| FAQ        | Simple Q&A bot                  | Minimal UI, suggestion chips, no lead capture        |
| Booking    | Appointment scheduling          | Calendar integration, meeting booking actions        |
| Onboarding | Product onboarding assistant    | Step-by-step suggestions, brochure enabled           |

**Schema changes:**

```prisma
model WidgetTemplate {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String
  category    String   // "support", "sales", "faq", "booking", "onboarding"
  config      String   // JSON: default widget configuration
  previewUrl  String?
  isPublic    Boolean  @default(true)
  createdAt   DateTime @default(now())
}

// Relax one-widget constraint:
model Widget {
  // Remove: workspaceId @unique
  // Add:
  name          String   @default("Default Widget")
  templateId    String?
  isDefault     Boolean  @default(false)
  deploymentMode String  @default("EMBED")  // "EMBED" | "STANDALONE" | "BOTH"
}
```

**Widget page UX:**

```text
/widget
  → "Create Widget" button
  → Choose: "Start from template" or "Custom widget"
  → Template gallery with previews
  → Opens customizer with template defaults pre-filled
  → Widget list view (when multiple widgets exist)
  → Per-widget: customize, playground, embed code, analytics
```

---

### 4.4 AI Actions

**Goal:** Allow AI agents to execute actions during conversations — meeting booking, lead creation, API calls, CRM updates, ticket creation, and workflow automation.

#### Current State

- `IntegrationAction` model with idempotent execution log
- `executeIntegrationAction` creates action records (simulated results)
- Tool registry exists: `src/features/integrations/server/tool-registry.ts`
- Three integrations registered (Gmail, Google Calendar, Slack) — all simulated
- Agent does not invoke tools during chat yet

#### Planned Implementation

**Action types:**

| Action                  | Integration                 | Trigger                         |
| ----------------------- | --------------------------- | ------------------------------- |
| Book meeting            | Google Calendar             | AI detects scheduling intent    |
| Send email              | Gmail                       | AI drafts follow-up email       |
| Create lead             | Internal                    | AI captures contact during chat |
| Update CRM              | HubSpot/Salesforce (future) | AI updates contact/deal         |
| Create ticket           | Internal (see 4.8)          | AI detects support issue        |
| Send Slack notification | Slack                       | Escalation or lead alert        |
| Custom API call         | Webhook                     | Configurable per workspace      |
| Run workflow            | Internal                    | Multi-step automation           |

**Architecture:**

```text
User message
  → widget-agent.ts (streamText with tools)
  → AI decides to call a tool
  → Tool handler validates + executes
  → executeIntegrationAction (real execution, not simulated)
  → Result streamed back to user in chat
  → IntegrationAction logged for audit
```

**Vercel AI SDK tool definition example:**

```typescript
// src/features/integrations/server/tools/book-meeting.ts
export const bookMeetingTool = {
  description: "Book a meeting on Google Calendar",
  parameters: z.object({
    title: z.string(),
    datetime: z.string(),
    attendeeEmail: z.string().email(),
    duration: z.number().default(30),
  }),
  execute: async (params, { workspaceId }) => {
    return executeIntegrationAction({
      db,
      workspaceId,
      provider: "google_calendar",
      actionType: "create_event",
      payload: params,
    });
  },
};
```

**Widget configuration additions:**

```prisma
model Widget {
  // ... existing fields ...
  enabledActions  String  @default("[]")  // JSON: ["book_meeting", "create_lead", "send_email"]
}
```

**Dashboard:** Integrations page expanded with per-action enable/disable toggles, OAuth connect flows, and action audit log.

**Prerequisites:**

- Real OAuth for Gmail, Google Calendar, Slack
- Wire tools into `widget-agent.ts` via AI SDK `tools` parameter
- User confirmation step for destructive actions (send email, create ticket)

---

### 4.5 GPT Chat & Widget Deployment

**Goal:** Support two deployment modes — a standalone ChatGPT-style AI chat page and an embeddable website widget — with separate branding, sharing, and deployment settings while sharing the same AI agent and knowledge base.

#### Current State

- Embeddable widget is fully functional
- No standalone chat page
- One widget per workspace with single branding config
- `Widget` model has all styling fields but no deployment mode concept

#### Planned Implementation

**Two deployment modes per widget:**

| Mode           | Description                            | URL Pattern                             |
| -------------- | -------------------------------------- | --------------------------------------- |
| **Embed**      | JavaScript snippet on customer website | `widget.bundle.js?key=PUBLIC_KEY`       |
| **Standalone** | Full-page ChatGPT-style chat           | `/chat/[publicKey]` or custom subdomain |

**Shared across modes:**

- Same AI agent (instructions, model, knowledge base)
- Same lead capture rules
- Same AI actions

**Separate per mode:**

- Branding (colors, logo, welcome message can differ)
- Sharing settings (public link, password protection, embed restrictions)
- Analytics tracking (separate metrics per deployment mode)
- Authorized domains (embed only)

**Schema additions:**

```prisma
model Widget {
  // ... existing fields ...
  deploymentMode        String  @default("EMBED")  // "EMBED" | "STANDALONE" | "BOTH"

  // Standalone-specific branding (overrides when set)
  standaloneTitle       String?
  standaloneDescription String?
  standaloneLogoUrl     String?
  standaloneFaviconUrl  String?
  standaloneCustomCss   String?

  // Sharing
  standalonePublicAccess  Boolean @default(true)
  standalonePassword      String?
  standaloneCustomSlug    String? @unique
}
```

**Standalone chat page:**

- Route: `src/app/chat/[publicKey]/page.tsx`
- Full-screen chat UI (similar to ChatGPT)
- Mobile-responsive
- Optional password gate
- SEO meta tags configurable from dashboard
- Share button with copyable link

**Dashboard widget page:**

- Deployment tab with mode selector (Embed / Standalone / Both)
- Separate branding panels for each mode
- Embed code generator (existing)
- Standalone link generator with custom slug option

---

### 4.6 Lead Assignment & Notifications

**Goal:** Automatically assign leads to team members and send real-time notifications through Slack, email, WhatsApp, and in-app alerts based on routing rules and lead scores.

#### Current State

- `Notification` model exists (in-app, DB-only)
- Notifications created on escalation and workflow events
- `WorkspaceMember` model with roles
- Conversation assignment supported at server level (`assignedMemberId`)
- No lead assignment, no routing rules, no external notification delivery
- Header has "Notifications" menu item but no notifications page

#### Planned Implementation

**Routing rules engine:**

```prisma
model RoutingRule {
  id            String   @id @default(cuid())
  workspaceId   String
  name          String
  priority      Int      @default(0)
  isActive      Boolean  @default(true)
  conditions    String   // JSON: { scoreMin, scoreMax, category, industry, source }
  assignToId    String?  // WorkspaceMember ID
  assignMethod  String   @default("specific")  // "specific" | "round_robin" | "least_loaded"
  notifyChannels String  @default("[]")  // JSON: ["slack", "email", "whatsapp", "in_app"]
  createdAt     DateTime @default(now())
  workspace     Workspace @relation(...)
  assignTo      WorkspaceMember? @relation(...)
}
```

**Notification channels:**

| Channel  | Integration           | Status            |
| -------- | --------------------- | ----------------- |
| In-app   | `Notification` model  | Exists (no UI)    |
| Email    | Gmail integration     | Simulated         |
| Slack    | Slack integration     | Simulated         |
| WhatsApp | WhatsApp Business API | Planned (see 4.7) |

**Assignment flow:**

```text
Lead qualified (score + category assigned)
  → Routing rules evaluated (priority order)
  → First matching rule assigns lead to team member
  → Notifications sent via configured channels:
      - In-app: Notification record created
      - Slack: Message to configured channel
      - Email: Notification email to assignee
      - WhatsApp: Message to assignee (future)
  → Dashboard shows assignment + notification history
```

**Dashboard additions:**

- Routing rules configuration page
- Notifications inbox page (`/notifications`)
- Lead detail shows assignment history and notification log
- Team member workload view (for round-robin / least-loaded routing)

---

### 4.7 WhatsApp Lead Follow-Up Automation

**Goal:** Automatically initiate and continue conversations with captured leads through WhatsApp — AI-powered follow-ups, lead qualification, meeting booking, and ongoing engagement.

#### Current State

- Not implemented. No WhatsApp SDK, no WhatsApp model, no WhatsApp routes.
- `Conversation.channel` defaults to `"WIDGET"` only.
- WhatsApp mentioned only in breadcrumb strings.

#### Planned Implementation

**Integration:** WhatsApp Business API (via Meta Cloud API or provider like Twilio/MessageBird).

**Schema additions:**

```prisma
model WhatsAppConfig {
  id              String   @id @default(cuid())
  workspaceId     String   @unique
  phoneNumberId   String
  businessAccountId String
  accessToken     String   // encrypted
  webhookVerifyToken String
  isActive        Boolean  @default(false)
  createdAt       DateTime @default(now())
  workspace       Workspace @relation(...)
}

// Extend Conversation.channel to include "WHATSAPP"
// Extend Lead.source to include "WHATSAPP"
```

**Automation flows:**

```text
Lead captured (widget or manual)
  → Automation rule triggered (configurable delay)
  → WhatsApp message sent to lead's phone
  → Lead replies → conversation continues via WhatsApp channel
  → AI agent handles conversation (same knowledge base + actions)
  → Qualification, booking, ticket creation all available
  → Conversation synced to dashboard inbox (multi-channel view)
```

**Automation rules:**

```prisma
model AutomationRule {
  id            String   @id @default(cuid())
  workspaceId   String
  name          String
  trigger       String   // "lead_captured", "lead_qualified", "meeting_missed", "custom"
  delay         Int      @default(0)  // minutes before first message
  channel       String   @default("whatsapp")
  messageTemplate String // AI prompt or fixed template
  followUpRules String   @default("[]")  // JSON: subsequent messages with delays
  isActive      Boolean  @default(true)
  workspace     Workspace @relation(...)
}
```

**Webhook handler:** `src/app/api/webhooks/whatsapp/route.ts` for incoming messages.

**Dashboard:**

- WhatsApp configuration page (connect Business API)
- Automation rules builder
- Multi-channel inbox (widget + WhatsApp conversations unified)
- Message templates management

**Dependencies:** Feature 4.1 (qualification), Feature 4.4 (AI actions for booking), Feature 4.6 (notifications).

---

### 4.8 Ticket Management System

**Goal:** Allow users to create, view, track, and manage support tickets from the widget — with status tracking, comments, attachments, agent assignment, and open/closed management.

#### Current State

- No `Ticket` model, no ticket routes, no ticket UI.
- `Conversation` model handles chat threads but is not designed for formal ticket workflows.
- `Attachment` model exists (linked to conversations).
- Escalation creates a paused conversation but not a ticket.

#### Planned Implementation

**Schema:**

```prisma
model Ticket {
  id              String   @id @default(cuid())
  workspaceId     String
  ticketNumber    Int      // auto-incrementing per workspace
  subject         String
  description     String
  status          String   @default("open")     // "open", "in_progress", "waiting", "resolved", "closed"
  priority        String   @default("medium")   // "low", "medium", "high", "urgent"
  category        String?
  contactId       String?
  conversationId  String?  // linked widget/WhatsApp conversation
  assignedMemberId String?
  createdBy       String   @default("ai")       // "ai", "visitor", "agent"
  resolvedAt      DateTime?
  closedAt        DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  workspace       Workspace @relation(...)
  contact         Contact? @relation(...)
  conversation    Conversation? @relation(...)
  assignedMember  WorkspaceMember? @relation(...)
  comments        TicketComment[]
  attachments     TicketAttachment[]
}

model TicketComment {
  id         String   @id @default(cuid())
  ticketId   String
  body       String
  authorType String   // "agent", "visitor", "ai", "system"
  authorId   String?
  isInternal Boolean  @default(false)
  createdAt  DateTime @default(now())
  ticket     Ticket   @relation(...)
}

model TicketAttachment {
  id         String   @id @default(cuid())
  ticketId   String
  filename   String
  mimeType   String
  size       Int
  storageKey String
  createdAt  DateTime @default(now())
  ticket     Ticket   @relation(...)
}
```

**Creation paths:**

| Source     | How                                                              |
| ---------- | ---------------------------------------------------------------- |
| AI agent   | Detects support issue during chat → creates ticket via AI action |
| Visitor    | "Create ticket" button in widget (or AI offers it)               |
| Agent      | Manual creation from dashboard                                   |
| Escalation | Auto-creates ticket when conversation is escalated               |

**Widget integration:**

- Ticket status visible in chat ("Your ticket #1234 is being reviewed")
- Visitor can add comments and attachments from widget
- AI updates visitor on ticket progress

**Dashboard:**

- `/tickets` — ticket list with filters (status, priority, assignee, date)
- Ticket detail page with comment thread, assignment, status changes
- Kanban board view (optional)
- Ticket metrics on analytics dashboard

**AI action:** `create_ticket` tool wired into widget agent (see 4.4).

---

### 4.9 Data Sources Management

**Goal:** Centralized system for training AI agents with multiple content sources — websites, documents, text snippets, Q&A pairs, API endpoints, Notion, Google Drive, GitHub docs, and help center articles — with source management, synchronization, indexing, and monitoring.

#### Current State

- `Document` model with `sourceType` field (PDF, DOCX, TXT, URL)
- URL ingestion: single-page `fetch` + HTML strip (no crawling)
- File upload with chunking, embedding, and Vectorize indexing
- Dashboard UI to add/delete sources, view processing status
- Retrieval pipeline with vector → search → text fallback

**Gap:** No multi-page crawling, no external connectors, no sync scheduling, no source health monitoring, no Q&A pairs, no API endpoints.

#### Planned Implementation

**Expanded source types:**

| Source Type      | Method                               | Sync               |
| ---------------- | ------------------------------------ | ------------------ |
| Website          | **Firecrawl** crawl API              | Scheduled re-crawl |
| PDF / DOCX / TXT | File upload                          | Manual re-upload   |
| Text snippet     | Direct text input                    | Manual edit        |
| Q&A pair         | Structured input (question + answer) | Manual edit        |
| API endpoint     | Fetch JSON/text from URL             | Scheduled refresh  |
| Notion           | Notion API integration               | Scheduled sync     |
| Google Drive     | Google Drive API                     | Scheduled sync     |
| GitHub           | GitHub API (repo docs/markdown)      | Scheduled sync     |
| Help center      | Firecrawl crawl of help site         | Scheduled re-crawl |

**Schema evolution:**

```prisma
model DataSource {
  id            String   @id @default(cuid())
  workspaceId   String
  name          String
  type          String   // "website", "document", "text", "qa", "api", "notion", "gdrive", "github", "help_center"
  config        String   @default("{}")  // JSON: type-specific config (URL, API key, folder ID, etc.)
  status        String   @default("active")  // "active", "paused", "error", "syncing"
  lastSyncAt    DateTime?
  lastSyncError String?
  syncInterval  Int?     // minutes; null = manual only
  documentCount Int      @default(0)
  chunkCount    Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  workspace     Workspace @relation(...)
  documents     Document[]

  @@index([workspaceId, status])
}

// Extend Document:
model Document {
  // ... existing fields ...
  dataSourceId  String?
  dataSource    DataSource? @relation(...)
  externalId    String?     // ID in source system (Notion page ID, Drive file ID, etc.)
  lastSyncedAt  DateTime?
}

model QAPair {
  id            String   @id @default(cuid())
  workspaceId   String
  dataSourceId  String?
  question      String
  answer        String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  workspace     Workspace @relation(...)
  dataSource    DataSource? @relation(...)
}
```

**Firecrawl integration for website crawling:**

```typescript
// src/features/knowledge/server/firecrawl.ts
import Firecrawl from "@mendable/firecrawl-js";

export async function crawlWebsite(
  url: string,
  options?: {
    maxPages?: number;
    includePaths?: string[];
    excludePaths?: string[];
  },
) {
  const firecrawl = new Firecrawl({ apiKey: env.FIRECRAWL_API_KEY });

  const result = await firecrawl.crawl(url, {
    limit: options?.maxPages ?? 100,
    includePaths: options?.includePaths,
    excludePaths: options?.excludePaths,
    scrapeOptions: { formats: ["markdown"] },
  });

  return result.data; // Array of { markdown, metadata: { title, url } }
}
```

**Sync workflow:**

```text
Data source created/updated
  → WorkflowRun created (status: RUNNING)
  → Source-specific fetcher runs:
      - Website: Firecrawl crawl
      - Notion: Notion API paginated fetch
      - Google Drive: Drive API file listing + download
      - GitHub: repo markdown files via API
      - API: HTTP GET with auth headers
  → Each page/file → extract text → chunk → embed → upsert vectors
  → Document records created/updated (dedup by externalId)
  → DataSource stats updated (documentCount, chunkCount, lastSyncAt)
  → WorkflowRun completed
  → On error: DataSource.status = "error", lastSyncError set
```

**Dashboard — Data Sources page (`/data-sources`):**

```text
/data-sources
  → Source list with type icons, status, last sync, document/chunk counts
  → "Add Source" → type picker → type-specific config form
  → Per source: sync now, pause, edit config, delete, view documents
  → Sync history log
  → Health monitoring: failed syncs, stale sources, index coverage
```

**Replaces current `/knowledge-base` page** (or `/knowledge-base` redirects to `/data-sources`).

---

## 5. External Services & Cost Planning

### 5.1 Firecrawl (Website Crawling)

**Purpose:** Crawl customer websites for knowledge base ingestion (Feature 4.9).

**Pricing reference:** [firecrawl.dev/pricing](https://www.firecrawl.dev/pricing)

| Plan     | Monthly Cost     | Credits | Pages   | Concurrent |
| -------- | ---------------- | ------- | ------- | ---------- |
| Free     | $0               | 1,000   | 1,000   | 2          |
| Hobby    | $16/mo (yearly)  | 5,000   | 5,000   | 5          |
| Standard | $83/mo (yearly)  | 100,000 | 100,000 | 50         |
| Growth   | $333/mo (yearly) | 500,000 | 500,000 | 100        |

**Credit costs:**

- Scrape / Crawl / Map: **1 credit per page**
- Search: 2 credits per 10 results
- Failed requests are not charged (except FIRE-1 agent)

**Recommended starting plan:** Hobby ($16/mo) for development; Standard ($83/mo) for production with multiple workspaces crawling sites.

**Integration:**

- Package: `@mendable/firecrawl-js`
- Env var: `FIRECRAWL_API_KEY`
- Used in: `src/features/knowledge/server/firecrawl.ts`
- Replaces current single-page `fetch` in `src/features/knowledge/server/extract.ts`

**Cost estimation per workspace:**

- Small site (50 pages): 50 credits per sync
- Medium site (500 pages): 500 credits per sync
- Weekly re-sync of 10 medium sites: ~20,000 credits/month → Standard plan

### 5.2 OpenRouter (Multi-Model AI)

**Purpose:** Access 400+ AI models through a single API — enables per-workspace model selection, cost optimization, and fallback routing (Features 4.1, 4.4).

**Pricing reference:** [openrouter.ai/pricing](https://openrouter.ai/pricing)

| Plan          | Platform Fee | Models          | Rate Limits        |
| ------------- | ------------ | --------------- | ------------------ |
| Free          | N/A          | 25+ free models | 50 req/day         |
| Pay-as-you-go | 5.5%         | 400+ models     | High global limits |
| Enterprise    | Custom       | 400+ models     | Dedicated limits   |

**Key details:**

- No markup on provider pricing — pay model rates directly + 5.5% platform fee
- No minimum spend on pay-as-you-go
- Failed/fallback attempts not billed (only successful runs)
- BYOK option: 1M free requests/month, 5% fee after

**Recommended approach:** Pay-as-you-go with credit top-up.

**Integration plan:**

```typescript
// src/lib/ai/providers.ts — add OpenRouter provider
import { createOpenAI } from "@ai-sdk/openai";

function getOpenRouterProvider() {
  return createOpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });
}

// Widget model selection expanded:
type WidgetModelProvider = "OPENAI" | "GOOGLE" | "OPENROUTER";

// Per-workspace model config:
// { provider: "OPENROUTER", modelName: "anthropic/claude-sonnet-4", fallbackModel: "openai/gpt-4o-mini" }
```

**Env var:** `OPENROUTER_API_KEY`

**Use cases in Widget:**

- **Chat responses:** User-selected model per widget (cost vs. quality tradeoff)
- **Lead scoring:** Cheaper models (e.g., `openai/gpt-4o-mini`) for batch qualification
- **Embeddings:** Continue using OpenAI direct for `text-embedding-3-small` (not via OpenRouter)
- **Fallback routing:** Primary model fails → auto-retry with fallback model

**Cost estimation:**

- Chat message (avg 2K tokens): $0.001–0.01 depending on model
- Lead scoring (avg 500 tokens): $0.0001–0.001 per lead
- 1,000 conversations/month with mixed models: ~$5–50/month

### 5.3 Current AI Providers (Keep)

Direct API keys for embeddings and default chat:

| Provider      | Env Var          | Used For                   |
| ------------- | ---------------- | -------------------------- |
| OpenAI        | `OPENAI_API_KEY` | Chat (default), embeddings |
| Google Gemini | `GEMINI_API_KEY` | Chat (alternative)         |

OpenRouter supplements — does not replace — direct providers. Embeddings stay on OpenAI direct for consistency.

---

## 6. Database Evolution

### Current Models (24 tables)

`User`, `Session`, `Account`, `Verification`, `Workspace`, `WorkspaceMember`, `WorkspaceInvite`, `Contact`, `ContactNote`, `Conversation`, `Widget`, `VisitorSession`, `Lead`, `WidgetLeadCapture`, `Attachment`, `Document`, `DocumentChunk`, `Integration`, `IntegrationAction`, `Notification`, `DomainEvent`, `WorkflowRun`

### New Models Required

| Model              | Feature                 | Priority |
| ------------------ | ----------------------- | -------- |
| `WidgetTemplate`   | 4.3 Widget Templates    | Phase 2  |
| `RoutingRule`      | 4.6 Lead Assignment     | Phase 2  |
| `AutomationRule`   | 4.7 WhatsApp Automation | Phase 3  |
| `WhatsAppConfig`   | 4.7 WhatsApp            | Phase 3  |
| `Ticket`           | 4.8 Tickets             | Phase 2  |
| `TicketComment`    | 4.8 Tickets             | Phase 2  |
| `TicketAttachment` | 4.8 Tickets             | Phase 2  |
| `DataSource`       | 4.9 Data Sources        | Phase 1  |
| `QAPair`           | 4.9 Data Sources        | Phase 1  |

### Existing Model Extensions

| Model          | New Fields                                                                                                                        | Feature       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `Lead`         | `companyName`, `companySize`, `industry`, `useCase`, `score`, `category`, `qualificationData`, `assignedMemberId`                 | 4.1, 4.6      |
| `Widget`       | `name`, `templateId`, `deploymentMode`, `draftConfig`, `publishedAt`, `standaloneTitle`, `standaloneCustomSlug`, `enabledActions` | 4.3, 4.4, 4.5 |
| `Document`     | `dataSourceId`, `externalId`, `lastSyncedAt`                                                                                      | 4.9           |
| `Conversation` | `channel` values: add `WHATSAPP`                                                                                                  | 4.7           |

---

## 7. Implementation Phases

### Phase 1 — Foundation (Current → Next)

**Goal:** Complete the core platform gaps and add data source crawling.

| Task                                                                      | Feature  | Effort |
| ------------------------------------------------------------------------- | -------- | ------ |
| Expose AI settings in widget customizer (instructions, model, escalation) | Existing | Small  |
| Build settings & members pages                                            | Existing | Small  |
| Notifications inbox page                                                  | 4.6      | Small  |
| Firecrawl integration for website crawling                                | 4.9      | Medium |
| Data Sources page (replace knowledge-base)                                | 4.9      | Medium |
| Q&A pair source type                                                      | 4.9      | Small  |
| Text snippet source type                                                  | 4.9      | Small  |
| OpenRouter provider integration                                           | 5.2      | Medium |
| Model selection in dashboard                                              | 5.2      | Small  |

### Phase 2 — Intelligence & Workflow

**Goal:** Lead qualification, tickets, playground, and real integrations.

| Task                                        | Feature  | Effort |
| ------------------------------------------- | -------- | ------ |
| Lead qualification scoring & categorization | 4.1      | Medium |
| Lead detail page with qualification data    | 4.1      | Medium |
| Playground page with draft/publish          | 4.2      | Medium |
| Widget templates (predefined)               | 4.3      | Medium |
| Ticket model + CRUD + dashboard             | 4.8      | Large  |
| Ticket creation from widget + AI action     | 4.8, 4.4 | Medium |
| Real OAuth for Gmail, Calendar, Slack       | 4.4      | Large  |
| Wire AI tools into widget agent             | 4.4      | Medium |
| Routing rules + lead assignment             | 4.6      | Medium |
| Slack + email notification delivery         | 4.6      | Medium |
| Standalone chat page                        | 4.5      | Medium |

### Phase 3 — Multi-Channel & Automation

**Goal:** WhatsApp, advanced automation, and external connectors.

| Task                                  | Feature | Effort |
| ------------------------------------- | ------- | ------ |
| WhatsApp Business API integration     | 4.7     | Large  |
| WhatsApp automation rules             | 4.7     | Medium |
| Multi-channel unified inbox           | 4.7     | Medium |
| Notion data source connector          | 4.9     | Medium |
| Google Drive data source connector    | 4.9     | Medium |
| GitHub data source connector          | 4.9     | Medium |
| API endpoint data source              | 4.9     | Small  |
| Scheduled sync jobs                   | 4.9     | Medium |
| Custom API webhook actions            | 4.4     | Medium |
| CRM integrations (HubSpot/Salesforce) | 4.4     | Large  |

### Phase 4 — Scale & Enterprise

| Task                                   | Feature    | Effort |
| -------------------------------------- | ---------- | ------ |
| Multi-widget per workspace             | 4.3        | Medium |
| Custom widget templates (user-created) | 4.3        | Medium |
| Kanban ticket board                    | 4.8        | Medium |
| Analytics dashboard page               | Existing   | Medium |
| Billing & plan limits                  | Existing   | Large  |
| Team reply from dashboard              | Existing   | Large  |
| Contacts page                          | Existing   | Medium |
| SSO & advanced security                | Enterprise | Large  |

---

## 8. Key File Reference

### By Feature Area

| Area                  | Key Paths                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **Widget embed**      | `public/widget/`, `scripts/build-widget.js`                                                   |
| **Widget agent (AI)** | `src/features/widget/server/widget-agent.ts`                                                  |
| **Widget config**     | `src/features/widget/server/widget-service.ts`, `src/components/widget/widget-customizer.tsx` |
| **Widget APIs**       | `src/app/api/widget/[publicKey]/`                                                             |
| **Conversations**     | `src/features/conversations/server/`, `src/components/widget/widget-conversations.tsx`        |
| **Leads**             | `src/features/leads/server/lead-service.ts`, `src/app/(dashboard)/leads/page.tsx`             |
| **Knowledge**         | `src/features/knowledge/`, `src/components/workspace/widget-knowledge-manager.tsx`            |
| **Integrations**      | `src/lib/integrations/`, `src/features/integrations/`                                         |
| **AI providers**      | `src/lib/ai/providers.ts`, `src/lib/ai/embeddings.ts`, `src/lib/ai/memory.ts`                 |
| **Auth**              | `src/lib/auth/server.ts`, `src/lib/auth/dashboard-context.ts`                                 |
| **Workspaces**        | `src/features/workspaces/`                                                                    |
| **Workflows**         | `src/lib/workflows/runner.ts`                                                                 |
| **Events**            | `src/lib/events/domain-events.ts`                                                             |
| **Notifications**     | `src/lib/notifications/create-notification.ts`                                                |
| **Storage**           | `src/lib/storage/`, `src/lib/cloudflare/vectorize.ts`                                         |
| **Schema**            | `prisma/schema.prisma`                                                                        |
| **Env vars**          | `.env.example`                                                                                |

### New Files to Create (by phase)

| Phase | New Files                                                                                                                                                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `src/features/knowledge/server/firecrawl.ts`, `src/lib/ai/openrouter.ts`, `src/app/(dashboard)/data-sources/page.tsx`, `src/features/knowledge/server/data-source-service.ts`                                                            |
| 2     | `src/app/(dashboard)/playground/page.tsx`, `src/app/(dashboard)/tickets/page.tsx`, `src/app/chat/[publicKey]/page.tsx`, `src/features/leads/server/qualification.ts`, `src/features/integrations/server/tools/`, `src/features/tickets/` |
| 3     | `src/app/api/webhooks/whatsapp/route.ts`, `src/features/whatsapp/`, `src/features/knowledge/server/connectors/notion.ts`, `src/features/knowledge/server/connectors/gdrive.ts`                                                           |

---

## Appendix: Environment Variables (Full)

```bash
# Database
DATABASE_URL="file:./prisma/dev.db"

# Auth
BETTER_AUTH_SECRET=""
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Cloudflare (production)
CLOUDFLARE_ACCOUNT_ID=""
CLOUDFLARE_API_TOKEN=""
D1_DATABASE_ID=""
R2_BUCKET_NAME=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
VECTORIZE_INDEX=""
SEARCH_INDEX=""

# AI — current
OPENAI_API_KEY=""
GEMINI_API_KEY=""

# AI — planned
OPENROUTER_API_KEY=""

# Crawling — planned
FIRECRAWL_API_KEY=""

# WhatsApp — planned
WHATSAPP_BUSINESS_ACCOUNT_ID=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_WEBHOOK_VERIFY_TOKEN=""
```

---

_This document should be updated as features are implemented. For engineering conventions and schema migration workflow, see [`AGENTS.md`](../AGENTS.md)._
