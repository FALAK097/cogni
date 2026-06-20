# widget

widget is an AI-first customer support platform with an embedded chat widget,
shared team inbox, knowledge-grounded answers, human handoff, integrations, and
durable workflows.

Current repository includes the production foundation and the first widget
vertical slice: workspace-scoped configuration, authorized domains, one-line
installation, live preview, visitor identity, streamed AI responses, persisted
conversations, and the shared inbox.

Full product specification, architecture decisions, roadmap, acceptance
criteria, and backlog live in [`AGENTS.md`](AGENTS.md).

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui with Base UI, Hugeicons
- Better Auth with Google OAuth
- Prisma ORM using SQLite locally and Cloudflare D1 in hosted environments
- T3 Env with Zod validation
- TanStack Query and next-themes
- Vercel deployment; Cloudflare D1, R2, Search, and Vectorize
- Oxlint, Oxfmt, Husky, lint-staged, GitHub Actions

Vercel AI SDK v6 with OpenAI and Gemini is active. Vercel Workflow, R2, and
Vectorize are next for durable knowledge ingestion. Chat SDK adapters will add
Slack, WhatsApp, Microsoft Teams, and Google Chat through the same conversation
service. Eve remains deferred until it provides a concrete advantage.

## Requirements

- Node.js 24
- pnpm 11
- Google OAuth application
- Optional: Cloudflare account and D1 database

This repository declares Node 24 in `.nvmrc` and `.node-version`.

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`pnpm dev` starts Next.js. Local development uses SQLite at `prisma/dev.db`.
Run the local Prisma migration once before first use.

No source or configuration file must be edited after cloning. Add environment
variables, then run the app.

## Environment

Required:

```env
ENV="development"
DATABASE_URL="file:./prisma/dev.db"
BETTER_AUTH_SECRET="at-least-32-random-characters"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

Generate a local auth secret:

```bash
openssl rand -base64 32
```

Optional Cloudflare D1 mode:

```env
CLOUDFLARE_ACCOUNT_ID=""
CLOUDFLARE_API_TOKEN=""
D1_DATABASE_ID=""
```

All three runtime values—account ID, API token, and database ID—must be set
together.

Knowledge storage and model providers:

```env
R2_BUCKET_NAME="widget-development"
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
VECTORIZE_INDEX="widget-knowledge-development"
OPENAI_API_KEY=""
GEMINI_API_KEY=""
```

Use different D1, R2, and Vectorize resources for development, preview, and
production through Vercel environment scopes.

## Google OAuth

Authorized local redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Production:

```text
https://your-domain.com/api/auth/callback/google
```

Authentication is Google-only. widget intentionally has no password, login,
registration, forgot-password, or reset-password pages.

First successful sign-in creates one workspace and an OWNER membership.
Provisioning is idempotent and repaired when an authenticated dashboard request
finds a user without a workspace.

## Database modes

### Local SQLite

Default mode. Leave all D1 variables blank.

```bash
pnpm db:migrate
pnpm dev
```

Prisma uses `@prisma/adapter-better-sqlite3`. Better Auth uses its Prisma
adapter with `provider: "sqlite"`.

### Cloudflare D1

Set `ENV="production"` together with the complete D1 variables. Runtime then
switches to `@prisma/adapter-d1`.

Prisma D1 support is currently preview. Better Auth keeps the Prisma adapter
on `provider: "sqlite"` because D1 is SQLite-compatible.

## Commands

```bash
pnpm dev           # start Next.js
pnpm build         # production build
pnpm start         # run production build
pnpm db:deploy     # apply existing Prisma migrations during deployment
pnpm db:migrate    # create/apply local Prisma migration during development
pnpm db:generate   # generate Prisma client
pnpm db:studio     # open Prisma Studio
pnpm lint          # Oxlint
pnpm lint:fix      # safe Oxlint fixes
pnpm fmt           # write formatting with Oxfmt
pnpm fmt:check     # verify formatting
pnpm typecheck     # TypeScript compiler
pnpm check         # lint + typecheck + format check
```

## Repository map

```text
src/app/                    routes, layouts, API handlers
src/components/             shared UI and product shell
src/lib/auth/               Better Auth and workspace provisioning
src/lib/db/                 lazy Prisma client and DB mode selection
src/lib/env/                T3 Env schema
src/providers/              client providers
prisma/                     schema and migrations
AGENTS.md                   complete engineering and product source of truth
```

## Quality and CI

```bash
pnpm check
pnpm build
```

GitHub Actions runs frozen install, Oxlint with annotations, TypeScript, Oxfmt,
and production build. Pre-commit runs Oxlint and Oxfmt on staged files.

ESLint and Prettier are intentionally not used.

## Current scope

Implemented:

- Responsive landing page
- Google OAuth modal and auth route
- Protected dashboard
- Real user/workspace display
- Local SQLite and Cloudflare D1 runtime selection
- Better Auth/Prisma SQLite compatibility
- Automatic, idempotent default workspace provisioning
- Initial Prisma migration
- Typed environment variables
- CI and git hooks
- Workspace-scoped contacts, conversations, and messages
- Shared inbox list and conversation detail
- Manual conversation creation and human replies
- Conversation status filtering and close/reopen actions
- Widget studio with branding, sizing, model, prompt, and domain controls
- One-line browser loader with show/hide/toggle/identify events
- Live OpenAI/Gemini preview and streamed visitor chat
- Visitor sessions and widget conversations persisted in Prisma

Next roadmap slice: URL crawling and file ingestion into R2 and Vectorize with
durable Workflow jobs and source-grounded answers.
