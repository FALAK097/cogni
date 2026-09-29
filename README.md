# Cogni

Cogni is an AI-first customer support platform with an embedded chat widget, shared team inbox, knowledge-grounded answers, human handoff, integrations, and durable workflows.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui with Base UI, Hugeicons
- Better Auth with Google OAuth
- Drizzle ORM using PostgreSQL locally and Neon Postgres in production
- TanStack Query, next-themes, Vercel AI SDK

## Quick Start

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure environment variables by copying `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

3. Run the development server:

   ```bash
   pnpm dev
   ```

   Development is pinned to `http://localhost:3000`. Keep `BETTER_AUTH_URL`, Google's
   authorized JavaScript origin, and the redirect URI
   `http://localhost:3000/api/auth/callback/google` on that same origin. If port 3000
   is occupied, stop the other local server or explicitly update all three settings
   before changing ports; the dev command does not silently select another port.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
ENV="development"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/widget"
DATABASE_URL_UNPOOLED=""
BETTER_AUTH_SECRET="at-least-32-random-characters"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Cloudflare APIs used from the Vercel Node.js runtime.
CLOUDFLARE_ACCOUNT_ID=""
CLOUDFLARE_API_TOKEN=""
CLOUDFLARE_AI_SEARCH_TOKEN=""
R2_BUCKET_NAME="widget-development"
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
CLOUDFLARE_INGESTION_QUEUE_URL=""
INGESTION_SHARED_SECRET=""
SEARCH_INDEX="widget-search-development"
OPENAI_API_KEY=""
GEMINI_API_KEY=""
```

## Commands

```bash
pnpm dev             # Start development server
pnpm test:widget-stream # Check widget stream framing and failure recovery
pnpm build           # Build the production bundle
pnpm start           # Run the built application
pnpm check           # Run formatting + types + linting checks
pnpm lint            # Run Oxlint checks
pnpm fmt             # Format code using Oxfmt
pnpm typecheck       # Verify TypeScript types
pnpm db:generate     # Generate Drizzle SQL migrations
pnpm db:migrate        # Apply Drizzle migrations to local PostgreSQL
pnpm db:migrate:remote # Apply Drizzle migrations to Neon
pnpm db:studio       # Open Drizzle Studio
```

## Vercel Deployment

The Next.js application deploys through Vercel's Git integration. OpenNext and Wrangler are not
part of the deployment pipeline. Server routes and `src/proxy.ts` run in Vercel's Node.js runtime.

Cloudflare remains the provider for R2 object storage and AI Search. Those services are accessed
through their S3-compatible and REST APIs, so they do not require Worker bindings.

### Environment & Secret Setup

Create a Vercel project from this repository and define these production environment variables:

- `ENV=production`
- `DATABASE_URL` (pooled URL, injected by the Neon integration)
- `DATABASE_URL_UNPOOLED` (direct URL, injected by the Neon integration)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (the final `https://` Vercel or custom production URL)
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_AI_SEARCH_TOKEN` (or `CLOUDFLARE_API_TOKEN`)
- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `SEARCH_INDEX`
- `GEMINI_API_KEY` and/or `OPENAI_API_KEY`

Set the Vercel production domain as an authorized redirect URI in Google OAuth:

```text
https://<production-domain>/api/auth/callback/google
```

### Database Migrations

The Neon database starts empty and `drizzle/0000_postgres_baseline.sql` is the single clean baseline.
Apply it before the first deployment. For future schema changes, generate and apply migrations with
the direct connection before deploying:

```bash
DATABASE_URL_UNPOOLED="postgresql://..." pnpm db:migrate:remote
```

Use the pooled `DATABASE_URL` for application traffic and the unpooled URL only for migrations and
administrative tools.

See [`docs/vercel-migration.md`](docs/vercel-migration.md) for the compatibility matrix, production
cutover checklist, verification steps, and rollback plan.
