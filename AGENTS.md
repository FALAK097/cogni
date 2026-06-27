# widget Engineering Guide

This file is the source of truth for the project layout, database schema management, and implementation rules.

## Core Architecture

widget is a Next.js 16 application. Frontend components, route handlers, server actions, authentication, and business logic share one repository.

```text
Customer website
  -> One-line loader
  -> Embedded widget
  -> Next.js application
       -> Conversations service
       -> Dashboard UI (Widget Analytics, Widget settings, Integrations, Knowledge Base)
```

## Relational Database Schema Invariants

- Local development uses **SQLite** (`dev.db`). Production uses **Cloudflare D1**.
- **WorkspaceMember**: Connects users to workspaces (replacing legacy `Membership`).
- **Widget**: Authorized domains are stored as a JSON string array directly in `Widget.authorizedDomains` (no separate relation model).
- **Conversation**: Message history is stored as a JSON string array in `Conversation.messages` (no separate `Message` table).
- **Attachment**: Attached files are linked directly to `Conversation` via `conversationId`.

### Changing the Schema

1. Edit `src/lib/db/schema.ts`.
2. Run `pnpm db:generate -- --name <name>` to generate SQL in `drizzle/`.
3. Run `pnpm db:migrate` to apply to local SQLite.
4. Apply SQL migration to production D1 with Wrangler:
   ```bash
   wrangler d1 execute <database-name> --remote --file drizzle/<migration_name>.sql
   ```

## Repository Structure

```text
src/
├── app/             # Next.js routes, API endpoints
├── components/      # Shared React components (Sidebar, Topbar, Widget UI)
├── features/        # Feature modules: conversations, widget, integrations, workspace
├── hooks/           # Custom React hooks (TanStack Query query-keys, etc.)
└── lib/             # Shared clients: Drizzle database, Better Auth, Vercel AI SDK, rate limiting
```

## Implementation Rules

1. **Type Safety**: Maintain absolute type safety (no `any` or `undefined`).
2. **Stateless Servers**: Do not depend on in-memory state across requests.
3. **Multi-tenancy**: Every database query must be scoped and checked against `workspaceId` membership.
4. **Google-only Auth**: Google OAuth is the only authentication method.
5. **Code Style**: Format using Oxfmt (`pnpm fmt`) and lint using Oxlint (`pnpm lint`). Check types via `pnpm typecheck`.
