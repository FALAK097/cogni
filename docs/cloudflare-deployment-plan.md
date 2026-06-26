# Cloudflare Deployment Plan

This plan deploys the current Next.js 16 app to Cloudflare Workers using OpenNext. It intentionally avoids staging. Local development stays local, production deploys only from `main`, and PR previews use separate preview Cloudflare resources so preview code does not accidentally read or write production data.

## Environment Model

| Environment | Trigger                        | App URL                                                 | Database               | Uploads                     | Knowledge Search                  |
| ----------- | ------------------------------ | ------------------------------------------------------- | ---------------------- | --------------------------- | --------------------------------- |
| Local dev   | `pnpm dev`                     | `http://localhost:3000`                                 | SQLite `prisma/dev.db` | local `.uploads`            | optional dev AI Search            |
| PR preview  | pull request / non-main branch | `pr-123-widget-preview.<workers-subdomain>.workers.dev` | D1 `widget-preview`    | R2 `widget-preview-uploads` | AI Search `widget-preview-search` |
| Production  | push to `main`                 | `widget-prod.<workers-subdomain>.workers.dev`           | D1 `widget-prod`       | R2 `widget-prod-uploads`    | AI Search `widget-prod-search`    |

This is not a staging setup. The preview resources exist only to keep PR preview builds away from production data.

## Current Codebase Notes

- The app is full-stack Next.js, not a static site. Use Cloudflare Workers with `@opennextjs/cloudflare`, not static Cloudflare Pages.
- Local development uses SQLite and local uploads.
- Production-like runtimes use Cloudflare D1, R2, and AI Search.
- Knowledge Base indexing uploads extracted document text to Cloudflare AI Search and keeps D1 chunks as the local fallback/source of truth.
- Deployed Workers use bindings for D1 (`DB`), uploads R2 (`UPLOADS`), Next cache R2 (`NEXT_INC_CACHE_R2_BUCKET`), and AI Search (`AI_SEARCH`).
- REST/S3 credentials remain optional fallback paths for non-Worker production-like execution, not the primary Cloudflare runtime path.
- `public/widget.bundle.js` is served as a static asset. The Worker-incompatible filesystem-backed `/widget.js` route has been removed.
- Next.js image optimization is configured through a global Cloudflare Images loader at `src/lib/cloudflare/image-loader.ts`.

## URL Model

For now, no custom domain:

```text
Landing + dashboard: https://widget-prod.<workers-subdomain>.workers.dev
Dashboard route:      https://widget-prod.<workers-subdomain>.workers.dev/dashboard
PR preview:           https://pr-123-widget-preview.<workers-subdomain>.workers.dev
```

`workers.dev` cannot give you `dashboard.yourdomain.com`, `admin.yourdomain.com`, or `docs.yourdomain.com`. Those are custom hostnames and should be added later when a real zone/domain is connected to Cloudflare.

Later custom-domain shape:

```text
yourdomain.com            -> landing app routes
dashboard.yourdomain.com  -> dashboard app routes
admin.yourdomain.com      -> future admin routes or worker
docs.yourdomain.com       -> future docs routes or worker
```

When custom domains are added, route by host in middleware or split `admin`/`docs` into separate Workers if they become separate apps.

## Phase 1: Cloudflare Account Setup

User-owned steps:

1. Create or log in to a Cloudflare account.
2. Pick the account where this project should live.
3. Enable Workers, D1, R2, and AI Search if prompted.
4. Run locally:

   ```bash
   pnpm wrangler login
   ```

5. Confirm the account ID:

   ```bash
   pnpm wrangler whoami
   ```

Save the account ID for `CLOUDFLARE_ACCOUNT_ID`.

## Phase 2: Install Deployment Tooling

Add OpenNext and Wrangler:

```bash
pnpm add @opennextjs/cloudflare
pnpm add -D wrangler
```

Add scripts to `package.json`:

```json
{
  "cf:build": "pnpm build:widget && SKIP_ENV_VALIDATION=1 opennextjs-cloudflare build",
  "cf:preview": "pnpm cf:build && opennextjs-cloudflare preview",
  "cf:deploy": "pnpm cf:build && wrangler deploy --env=\"\" --keep-vars",
  "cf:deploy:preview": "pnpm cf:build && wrangler deploy --env preview --keep-vars",
  "cf:upload:preview": "pnpm cf:build && wrangler versions upload --env preview --keep-vars",
  "cf:typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
}
```

Keep the existing build script because it builds the widget bundle first:

```json
{
  "build": "pnpm build:widget && next build --webpack"
}
```

## Phase 3: Add Worker Configuration

Create `wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "widget-prod",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-06-26",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "workers_dev": true,
  "preview_urls": true,
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS",
  },
  "observability": {
    "enabled": true,
  },
  "r2_buckets": [
    {
      "binding": "NEXT_INC_CACHE_R2_BUCKET",
      "bucket_name": "widget-prod-next-cache",
    },
  ],
  "env": {
    "preview": {
      "name": "widget-preview",
      "r2_buckets": [
        {
          "binding": "NEXT_INC_CACHE_R2_BUCKET",
          "bucket_name": "widget-preview-next-cache",
        },
      ],
    },
  },
}
```

Create `open-next.config.ts`:

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
```

Add to `.gitignore`:

```text
.open-next
.dev.vars
cloudflare-env.d.ts
```

Add `public/_headers`:

```text
/_next/static/*
  Cache-Control: public,max-age=31536000,immutable

/widget.bundle.js
  Cache-Control: public,max-age=300,stale-while-revalidate=3600
  X-Content-Type-Options: nosniff
```

Do not commit real production database IDs or secrets. Put environment-specific values in Cloudflare Worker variables/secrets.

## Phase 4: Create Production Resources

Create D1:

```bash
pnpm wrangler d1 create widget-prod
```

Create R2:

```bash
pnpm wrangler r2 bucket create widget-prod-uploads
pnpm wrangler r2 bucket create widget-prod-next-cache
```

Create AI Search:

```bash
pnpm wrangler ai-search create widget-prod-search
```

Record:

```text
prod D1 database_id
prod AI Search instance name: widget-prod-search
prod R2 upload bucket: widget-prod-uploads
prod OpenNext cache bucket: widget-prod-next-cache
```

## Phase 5: Create Preview Resources

Create separate preview resources:

```bash
pnpm wrangler d1 create widget-preview
pnpm wrangler r2 bucket create widget-preview-uploads
pnpm wrangler r2 bucket create widget-preview-next-cache
pnpm wrangler ai-search create widget-preview-search
```

Record:

```text
preview D1 database_id
preview AI Search instance name: widget-preview-search
preview R2 upload bucket: widget-preview-uploads
preview OpenNext cache bucket: widget-preview-next-cache
```

Do not point PR preview variables at production IDs or buckets.

## Phase 6: Create Deploy API Tokens

The deployed Worker should not need runtime Cloudflare API tokens for D1, R2 uploads, R2 cache, or AI Search. Those are bound directly in `wrangler.jsonc`.

Create GitHub deploy tokens only:

| Token                          | Used by              | Minimum access                                     |
| ------------------------------ | -------------------- | -------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`         | push to `main`       | Workers Scripts write, D1/R2/AI Search admin setup |
| `CLOUDFLARE_PREVIEW_API_TOKEN` | internal PR previews | Workers Scripts write for preview uploads          |

Optional R2 S3 credentials can still be created for local scripts or non-Worker fallback, but they should not be stored as Worker runtime secrets when the `UPLOADS` binding is configured.

Important security note: if Cloudflare only lets a token be scoped at the account level for a capability, then a malicious PR could theoretically abuse that token if PR builds run untrusted code. The practical protection for this repo is:

- preview Worker gets only preview bindings for D1, R2 uploads, R2 cache, and AI Search;
- preview Worker should not receive a broad runtime Cloudflare API token;
- fork/untrusted PR preview builds should stay disabled;
- preview URLs should be protected with Cloudflare Access if external reviewers do not need public access.

For a hard isolation guarantee against untrusted PR code, put preview resources in a separate Cloudflare account.

## Phase 7: Configure Worker Variables And Secrets

Production Worker `widget-prod` non-secret variables:

```env
ENV=production
DATABASE_URL=file:./prisma/dev.db
BETTER_AUTH_URL=https://widget-prod.<workers-subdomain>.workers.dev
CLOUDFLARE_ACCOUNT_ID=<account_id>
D1_DATABASE_ID=<prod_d1_database_id>
R2_BUCKET_NAME=widget-prod-uploads
SEARCH_INDEX=widget-prod-search
```

The committed Wrangler bindings are the production source of truth:

- `DB` -> D1 `widget-prod`
- `UPLOADS` -> R2 `widget-prod-uploads`
- `NEXT_INC_CACHE_R2_BUCKET` -> R2 `widget-prod-next-cache`
- `AI_SEARCH` -> AI Search `widget-prod-search`

Production secrets:

```bash
pnpm wrangler secret put BETTER_AUTH_SECRET
pnpm wrangler secret put GOOGLE_CLIENT_ID
pnpm wrangler secret put GOOGLE_CLIENT_SECRET
pnpm wrangler secret put OPENAI_API_KEY
pnpm wrangler secret put GEMINI_API_KEY
```

Preview Worker env `preview` non-secret variables:

```env
ENV=production
DATABASE_URL=file:./prisma/dev.db
BETTER_AUTH_URL=https://widget-preview.<workers-subdomain>.workers.dev
CLOUDFLARE_ACCOUNT_ID=<account_id>
D1_DATABASE_ID=<preview_d1_database_id>
R2_BUCKET_NAME=widget-preview-uploads
SEARCH_INDEX=widget-preview-search
```

The preview Wrangler bindings are:

- `DB` -> D1 `widget-preview`
- `UPLOADS` -> R2 `widget-preview-uploads`
- `NEXT_INC_CACHE_R2_BUCKET` -> R2 `widget-preview-next-cache`
- `AI_SEARCH` -> AI Search `widget-preview-search`

Preview secrets:

```bash
pnpm wrangler secret put BETTER_AUTH_SECRET --env preview
pnpm wrangler secret put GOOGLE_CLIENT_ID --env preview
pnpm wrangler secret put GOOGLE_CLIENT_SECRET --env preview
pnpm wrangler secret put OPENAI_API_KEY --env preview
pnpm wrangler secret put GEMINI_API_KEY --env preview
```

Use different values for production and preview wherever possible. `BETTER_AUTH_SECRET` must be at least 32 characters.

`DATABASE_URL` remains required by the env schema even though production-like runtimes use D1 through the Prisma D1 adapter. Keep it set to a harmless local SQLite URL.

## Phase 8: Google OAuth Setup

In Google Cloud Console:

1. Go to `APIs & Services -> OAuth consent screen`.
2. Configure app name, support email, and developer contact email.
3. Add test users if the app is still in testing mode.
4. Go to `APIs & Services -> Credentials`.
5. Create `OAuth client ID`.
6. Select `Web application`.
7. Add authorized JavaScript origins:

   ```text
   http://localhost:3000
   https://widget-prod.<workers-subdomain>.workers.dev
   ```

8. Add authorized redirect URIs:

   ```text
   http://localhost:3000/api/auth/callback/google
   https://widget-prod.<workers-subdomain>.workers.dev/api/auth/callback/google
   ```

9. Copy the client ID and client secret into Cloudflare Worker secrets.

Do not expect Google login to work on random PR preview aliases. Google OAuth redirect URIs must be exact and Google does not support wildcard redirect URIs for this use case.

For PR previews:

- Test public pages and widget routes without Google login.
- If dashboard login is required in a preview, use one stable preview URL and add that exact origin and callback URI to Google Console.
- Do not add every ephemeral PR URL to Google Console.

## Phase 9: Database Migration

Apply the existing schema to production D1:

```bash
pnpm wrangler d1 execute widget-prod --remote --file prisma/migrations/20260621074716_init/migration.sql
```

Apply the same schema to preview D1:

```bash
pnpm wrangler d1 execute widget-preview --remote --file prisma/migrations/20260621074716_init/migration.sql
```

For future schema changes:

```bash
pnpm db:migrate -- --name <name>
pnpm wrangler d1 execute widget-prod --remote --file prisma/migrations/<timestamp_name>/migration.sql
pnpm wrangler d1 execute widget-preview --remote --file prisma/migrations/<timestamp_name>/migration.sql
```

Do not run production D1 migrations from PR preview builds. Run prod migrations as an explicit release step before or with the main-branch production deploy.

## Phase 10: Worker Runtime Compatibility Fixes

Before first deploy:

1. Verify `pdf-parse`, `mammoth`, Prisma D1 adapter, and AWS SDK R2 calls under `pnpm cf:preview`.
2. Keep production and preview uploads on R2. The local `.uploads` path must never be used when `ENV=production`.
3. Confirm no route exports `runtime = "edge"`. OpenNext Cloudflare expects the Next.js Node runtime.
4. Validate AI Search indexing by uploading a small TXT document and asking a question that should retrieve that text.
5. Confirm representative `<Image />` usage emits `/cdn-cgi/image/...` URLs in production builds.

## Phase 11: Local Production-Like Preview

Run checks:

```bash
pnpm check
pnpm build
pnpm cf:preview
```

Validate:

- `/`
- `/dashboard`
- `/widget.bundle.js`
- `/api/dashboard/me`
- `/api/widget/:publicKey/config`
- Google login redirect generation
- Widget chat route
- File upload and download through R2
- Knowledge upload and AI Search retrieval

## Phase 12: First Production Deploy

Deploy:

```bash
pnpm cf:deploy
```

Record the production URL:

```text
https://widget-prod.<workers-subdomain>.workers.dev
```

Post-deploy validation:

- Visit `/`.
- Visit `/dashboard`.
- Sign in with Google.
- Create or load the default workspace.
- Configure a widget.
- Load `https://widget-prod.<workers-subdomain>.workers.dev/widget.bundle.js`.
- Test a widget session.
- Upload a small text file to the Knowledge Base.
- Verify an R2 object was created.
- Verify D1 tables contain auth, workspace, widget, document, and conversation data.
- Verify AI Search returns relevant chunks for the uploaded document.

## Phase 13: GitHub Actions Auto Deploy

The repo includes `.github/workflows/cloudflare.yml`.

Add these GitHub secrets:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
CLOUDFLARE_PREVIEW_API_TOKEN
```

Production deploys:

- Trigger: push to `main`.
- Build: `pnpm cf:build`.
- Deploy: `OPEN_NEXT_DEPLOY=true wrangler deploy --env="" --keep-vars` through `cloudflare/wrangler-action@v3`.
- Worker: `widget-prod`.

PR previews:

- Trigger: internal pull requests only.
- Build: `pnpm cf:build`.
- Upload: `OPEN_NEXT_DEPLOY=true wrangler versions upload --env preview --keep-vars --preview-alias pr-<number>` through `cloudflare/wrangler-action@v3`.
- Worker: `widget-preview`.

Main branch is the only automatic production deploy path.

## Phase 14: PR Preview Deployments Without Prod Data

PR preview rules:

- Preview bindings must use `widget-preview` D1, `widget-preview-uploads` R2, `widget-preview-next-cache` R2, and `widget-preview-search` AI Search.
- Preview Worker secrets should include auth/app-provider secrets only, not broad Cloudflare API tokens or R2 S3 keys.
- PR preview builds must never run `wrangler d1 execute widget-prod`.
- PR preview builds must never set `D1_DATABASE_ID` to the prod database ID.
- PR preview builds must never set `R2_BUCKET_NAME` to the prod uploads bucket.
- PR preview builds must never set `SEARCH_INDEX` to the prod AI Search instance.
- Protect preview URLs with Cloudflare Access if they contain real test data.

## What I Can Do With Wrangler

I can set up most of the deployment from this repo if Wrangler is authenticated and you approve networked commands.

I can do:

- Install `@opennextjs/cloudflare` and `wrangler`.
- Add `wrangler.jsonc`, `open-next.config.ts`, scripts, `public/_headers`, GitHub Actions, the Cloudflare Images loader, and `.gitignore` entries.
- Create production and preview D1 databases.
- Create production and preview R2 buckets.
- Create production and preview AI Search instances.
- Apply D1 migration SQL to production and preview when you approve it.
- Set Worker secrets if you provide the values during Wrangler prompts.
- Run local OpenNext preview.
- Deploy to `workers.dev`.

I cannot fully do without your action:

- Complete `wrangler login` browser auth unless you do it.
- Choose billing/account-level product enablement if Cloudflare prompts.
- Create or configure Google OAuth consent and credentials in Google Cloud Console.
- Know your secret values unless you provide them.
- Guarantee untrusted fork PR isolation inside the same Cloudflare account if Cloudflare token scopes are account-wide.

## User Checklist

You need to provide or complete:

- Cloudflare account access.
- `pnpm wrangler login`.
- Cloudflare account ID.
- Google OAuth client ID and secret.
- Google OAuth production redirect URI:

  ```text
  https://widget-prod.<workers-subdomain>.workers.dev/api/auth/callback/google
  ```

- `BETTER_AUTH_SECRET`.
- `OPENAI_API_KEY` and/or `GEMINI_API_KEY`.
- Permission for me to run networked Wrangler commands when you want me to execute the setup.

## Reference Docs

- Cloudflare Workers Next.js guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- OpenNext Cloudflare guide: https://opennext.js.org/cloudflare
- Cloudflare Workers GitHub Actions: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- Cloudflare Images with Next.js: https://developers.cloudflare.com/images/optimization/transformations/integrate-with-frameworks/
- Cloudflare Workers Preview URLs: https://developers.cloudflare.com/workers/configuration/previews/
- Cloudflare D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- Cloudflare R2 API tokens: https://developers.cloudflare.com/r2/api/tokens/
- Cloudflare AI Search REST API: https://developers.cloudflare.com/ai-search/api/search/rest-api/
- Cloudflare AI Search items API: https://developers.cloudflare.com/ai-search/api/items/rest-api/
- Cloudflare AI Search filtering: https://developers.cloudflare.com/ai-search/configuration/retrieval/filtering/
- Better Auth Google provider: https://better-auth.com/docs/authentication/google
