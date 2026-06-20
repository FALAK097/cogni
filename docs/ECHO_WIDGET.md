# Echo Widget

Echo Widget is the embedded customer chat experience in the widget platform. It uses OutCaller Echo UI/layout with widget brand colors, vanilla JS embed (`widget.bundle.js`), and Next.js route handlers (no FastAPI).

## Architecture

```text
Customer site
  -> widget.bundle.js (esbuild IIFE)
  -> /api/widget/{publicKey}/*
  -> conversation-service + widget-agent + knowledge retrieval
  -> Campaign context + Lead capture
```

## Install

```html
<script
  src="https://your-app.example/widget.bundle.js"
  data-widget-key="YOUR_PUBLIC_KEY"
  async
></script>
```

Browser API: `window.Widget.show()`, `hide()`, `toggle()`, `identify({ id, name, email })`, `destroy()`.

## Build

```bash
pnpm build:widget   # bundles public/widget.js -> public/widget.bundle.js
pnpm build          # runs widget bundle + Next.js build
```

## Public API routes

| Route                                              | Purpose                           |
| -------------------------------------------------- | --------------------------------- |
| `GET /api/widget/[publicKey]/config`               | Widget branding and feature flags |
| `POST /api/widget/[publicKey]/session`             | Create/resume visitor session     |
| `POST /api/widget/[publicKey]/message`             | Persist user/assistant message    |
| `GET /api/widget/[publicKey]/history`              | Session message history           |
| `POST /api/widget/[publicKey]/chat`                | SSE streaming AI chat             |
| `POST /api/widget/[publicKey]/feedback`            | Message thumbs up/down            |
| `GET /api/widget/[publicKey]/sessions`             | Recent visitor sessions           |
| `POST /api/widget/[publicKey]/documents`           | Brochure/document search          |
| `POST /api/widget/[publicKey]/lead-capture/detect` | Lead form trigger                 |
| `POST /api/widget/[publicKey]/lead-capture/submit` | Submit lead                       |
| `POST /api/widget/[publicKey]/upload`              | File upload                       |
| `POST /api/widget/[publicKey]/identify`            | Link visitor to contact           |

## Dashboard

- `/dashboard/widget` — EchoCustomizer (General, Appearance, Content, Lead Capture, Embed tabs) + live preview
- `GET /api/campaigns` — list/create campaigns
- `GET /api/leads` — Echo captured leads
- `GET /api/analytics/widget` — sessions, feedback, leads, geo/device breakdown

## Campaigns and knowledge

Assign a campaign on the widget General tab. Campaign `instructions` are injected into the AI system prompt. Optional `CampaignDocument` links scope knowledge retrieval to specific documents; empty means all workspace `READY` documents.

## Data model

- Extended `Widget` — Echo appearance/content/lead fields
- `Campaign`, `CampaignDocument`
- `Lead`, `WidgetLeadCapture`
- `MessageFeedback`
- Extended `VisitorSession` — visitor metadata

## Exclusions

- No voice calling (Ultravox/Gemini Live removed)
- No `.env` / `.env.example` changes required
- Uses existing `OPENAI_API_KEY` / `GEMINI_API_KEY`

## Default colors

Widget repo brand defaults: primary `#14805e`, background `#ffffff`, text `#171717`, bot bubble `#f2f2f8`.

## Migration from iframe loader

Previous embed:

```html
<script src=".../widget.js" data-widget-key="..." async></script>
```

New embed uses the bundle directly:

```html
<script src=".../widget.bundle.js" data-widget-key="..." async></script>
```
