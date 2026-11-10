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

## Cloudflare Workers Deployment

The application runs on Cloudflare Workers using OpenNext (`@opennextjs/cloudflare`) and targets `https://cogni.falakgala.dev`.

### Automated Deployment via Cloudflare Workers Builds (Git Integration)

The `cogni` Worker is natively integrated with GitHub using Cloudflare Workers Builds (`cf builds triggers`). Every push to the `main` branch automatically triggers:

1. Repository checkout (`FALAK097/cogni` on branch `main`)
2. OpenNext Cloudflare compilation (`pnpm run build:cf`)
3. Worker deployment to Cloudflare (`npx wrangler deploy`)

### Worker Secrets & Environment Variables

Non-secret variables and bindings are configured in [`wrangler.jsonc`](wrangler.jsonc). Secret credentials must be set in Cloudflare via `wrangler secret put` or via Cloudflare Dashboard (**Workers & Pages** > `cogni` > **Settings** > **Variables and Secrets**):

```bash
pnpm exec wrangler secret put DATABASE_URL
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
pnpm exec wrangler secret put CLOUDFLARE_API_TOKEN
pnpm exec wrangler secret put INGESTION_SHARED_SECRET
pnpm exec wrangler secret put OPENAI_API_KEY
pnpm exec wrangler secret put GEMINI_API_KEY
pnpm exec wrangler secret put R2_ACCESS_KEY_ID
pnpm exec wrangler secret put R2_SECRET_ACCESS_KEY
```

### Google OAuth Redirect URI

Add the production custom domain callback URI to your Google Cloud Console OAuth 2.0 Client credentials:

```text
https://cogni.falakgala.dev/api/auth/callback/google
```

### Database Migrations

Use the unpooled connection string for running migrations prior to deployment:

```bash
DATABASE_URL_UNPOOLED="postgresql://..." pnpm db:migrate:remote
```

The application uses the pooled connection with `@neondatabase/serverless` / pooled PostgreSQL with `max: 1` and `prepare: false` inside Cloudflare Workers.
