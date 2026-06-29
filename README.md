# widget

widget is an AI-first customer support platform with an embedded chat widget, shared team inbox, knowledge-grounded answers, human handoff, integrations, and durable workflows.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui with Base UI, Hugeicons
- Better Auth with Google OAuth
- Drizzle ORM using SQLite locally and Cloudflare D1 in production
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
DATABASE_URL="file:./dev.db"
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
pnpm db:generate     # Generate Drizzle SQL migrations
pnpm db:migrate      # Apply Drizzle migrations locally
pnpm db:studio       # Open Drizzle Studio
```

## Cloudflare Workers Deployment

Deployment is configured using Cloudflare's native **Git Integration (Workers Builds)**:

- **Production**: Pushes and merges to `main` automatically deploy to the `widget-prod` worker using production database and assets.
- **PR Previews**: Open Pull Requests automatically trigger builds that deploy to the `widget-preview` worker (with isolated preview databases and R2 buckets) and post a live preview URL comment on your PR.

### Environment & Secret Setup

All environment variables and secrets must be defined in the Cloudflare Dashboard under your Worker's settings (**Settings > Variables and secrets**):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`

### Database Migrations

Migrations are automatically applied by the Cloudflare build machine before the code is deployed, using Wrangler's built-in migrations command linked to the `drizzle/` SQL files. No manual database update command is required on push.
