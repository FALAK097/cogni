# widget

widget is an AI-first customer support platform with an embedded chat widget, shared team inbox, knowledge-grounded answers, human handoff, integrations, and durable workflows.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui with Base UI, Hugeicons
- Better Auth with Google OAuth
- Prisma ORM using SQLite locally and Cloudflare D1 in production
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

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
ENV="development"
DATABASE_URL="file:./prisma/dev.db"
BETTER_AUTH_SECRET="at-least-32-random-characters"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Optional local/fallback Cloudflare keys. Deployed Workers use bindings.
CLOUDFLARE_ACCOUNT_ID=""
CLOUDFLARE_API_TOKEN=""
CLOUDFLARE_AI_SEARCH_TOKEN=""
D1_DATABASE_ID=""
R2_BUCKET_NAME="widget-development"
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
SEARCH_INDEX="widget-search-development"
OPENAI_API_KEY=""
GEMINI_API_KEY=""
```

## Commands

```bash
pnpm dev             # Start development server
pnpm build           # Build the production bundle
pnpm start           # Run the built application
pnpm check           # Run formatting + types + linting checks
pnpm lint            # Run Oxlint checks
pnpm fmt             # Format code using Oxfmt
pnpm typecheck       # Verify TypeScript types
pnpm db:migrate      # Generate and apply Prisma migrations
pnpm db:studio       # Open Prisma database console
```

## Cloudflare Workers Deployment

Deployment is configured for Cloudflare Workers through OpenNext, Wrangler, and GitHub Actions.

```bash
pnpm cf:build             # Build OpenNext Worker output
pnpm cf:preview           # Preview locally in the Workers runtime
pnpm cf:deploy            # Deploy widget-prod with Wrangler
pnpm cf:upload:preview    # Upload a widget-preview version for PR preview aliases
pnpm cf:typegen           # Generate Cloudflare env binding types
```

GitHub Actions requires these repository secrets:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
CLOUDFLARE_PREVIEW_API_TOKEN
```

Production deploys run on pushes to `main`. Internal PRs upload preview versions to the isolated `widget-preview` Worker environment. Full setup steps are in `docs/cloudflare-deployment-plan.md`.
