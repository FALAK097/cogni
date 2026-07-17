# Vercel deployment cutover

This migration moves the Next.js runtime from Cloudflare Workers to Vercel and the relational
database from D1/SQLite to Neon Postgres. R2 and Cloudflare AI Search remain in Cloudflare and are
accessed through public APIs instead of Worker bindings.

## Compatibility

| Capability              | Vercel status  | Implementation                                           |
| ----------------------- | -------------- | -------------------------------------------------------- |
| Next.js 16              | Native         | Vercel Node.js Functions; OpenNext is removed            |
| `proxy.ts`              | Native Node.js | Adds `x-pathname` for dashboard routing                  |
| D1                      | Replaced       | Neon Postgres via the pooled `DATABASE_URL`              |
| R2 uploads              | Compatible     | Cloudflare's S3-compatible API and scoped R2 credentials |
| AI Search               | Compatible     | Cloudflare REST API and a scoped API token               |
| Next image optimization | Native         | Vercel/Next image optimization replaces `/cdn-cgi/image` |
| Static widget caching   | Native         | `next.config.ts` response headers replace `_headers`     |

## Owner checklist

1. Create or connect a Neon database from the Vercel project integration.
2. Confirm Vercel contains `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).
3. Apply the PostgreSQL baseline to the empty Neon database:

   ```bash
   pnpm db:migrate:remote
   ```

4. Add the remaining variables from `.env.example` to Vercel. R2 credentials must have object read
   and write access only to the uploads bucket. The AI Search token must have access to the selected
   search instance.
   Before deleting anything in Cloudflare, verify the live inventory from Wrangler rather than
   relying on stale notes.
5. Set `BETTER_AUTH_URL` to the final production URL and add this Google OAuth redirect URI:

   ```text
   https://<production-domain>/api/auth/callback/google
   ```

6. Deploy to a Vercel preview and verify Google sign-in, workspace access, widget bootstrap/chat,
   file upload/download/delete, knowledge ingestion, and AI Search retrieval.
7. Move the production domain to Vercel and update widget embed URLs if the hostname changed.

## Cogni production values

Use these values for the Vercel **Production** environment. Add the same non-secret values to
Preview only if previews should talk to production Cloudflare resources.

| Variable                | Production value                   | Source                        |
| ----------------------- | ---------------------------------- | ----------------------------- |
| `ENV`                   | `production`                       | Application environment       |
| `BETTER_AUTH_URL`       | `https://cogni.falakgala.dev`      | Final production origin       |
| `CLOUDFLARE_ACCOUNT_ID` | `598a393819cd44e21ef2145dabea9a2f` | Existing Worker account       |
| `R2_BUCKET_NAME`        | `widget-prod-uploads`              | Existing R2 upload bucket     |
| `SEARCH_INDEX`          | `widget-prod-search`               | Existing AI Search instance   |
| `WIDGET_MODEL_PROVIDER` | `GOOGLE`                           | Existing Worker configuration |
| `WIDGET_MODEL_NAME`     | `gemini-2.5-flash`                 | Existing Worker configuration |
| `DATABASE_URL`          | Injected pooled Neon URL           | Vercel Neon integration       |
| `DATABASE_URL_UNPOOLED` | Injected direct Neon URL           | Vercel Neon integration       |

Cloudflare reports the existing secret names `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, and `OPENAI_API_KEY`, but secret values cannot be read back.
Copy them from the original password manager/source. Because Neon starts empty, it is also safe to
generate a new `BETTER_AUTH_SECRET` with `openssl rand -base64 32`; doing so invalidates only old
sessions. Rotate a Google client secret or model-provider key at its provider if its original value
is unavailable.

Vercel also needs credentials that the Worker did not need because it used native bindings:

- `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`: create an R2 S3 API token scoped to object read and
  write for `widget-prod-uploads` only.
- `CLOUDFLARE_AI_SEARCH_TOKEN`: create a Cloudflare API token with AI Search Edit and AI Search Run
  for the production account. Do not reuse a global API key.
- `OPENAI_API_KEY` is optional while the configured provider is Google. `GEMINI_API_KEY` is required.

## Cutover sequence

1. Import `FALAK097/widget` in Vercel and select this repository root with the detected Next.js
   framework settings. Do not set `SKIP_ENV_VALIDATION` in Vercel.
2. Install the Neon integration from the Vercel project, create a production database, and confirm
   the pooled and unpooled variables above exist for Production.
3. Add all production variables, deploy once to the generated Vercel URL, and run the baseline
   against the empty database with `DATABASE_URL_UNPOOLED`:

   ```bash
   pnpm db:migrate:remote
   ```

4. In Vercel, add `cogni.falakgala.dev` under Project → Settings → Domains. Add the exact DNS record
   Vercel displays in the DNS provider for `falakgala.dev`; do not guess the target because Vercel
   may provide project-specific records. Wait until Vercel shows the domain as valid and SSL is ready.
5. In the Google Cloud Console OAuth web client, add the authorized JavaScript origin
   `https://cogni.falakgala.dev` and the exact authorized redirect URI
   `https://cogni.falakgala.dev/api/auth/callback/google`. Keep localhost entries for development.
6. Set `BETTER_AUTH_URL=https://cogni.falakgala.dev`, redeploy Production, then verify sign-in,
   sign-out, workspace isolation, dashboard pages, chat, upload/download/delete, knowledge indexing,
   retrieval, and an embedded widget on an authorized test domain.
7. Update every customer embed script host from the Workers URL to
   `https://cogni.falakgala.dev/widget.bundle.js`. Keep the existing `data-widget-key` value.
8. Leave the Worker intact until the domain and embed smoke tests pass. Then disable traffic to the
   old Worker; retain the R2 bucket and AI Search instance because Cogni still uses them.

## Rollback

Move the production domain back to the Worker if the Vercel verification fails. There is no D1 data
to reconcile; the new Neon database starts empty.

## Free-tier expectations

Neon's Free plan is suitable for the current two-user load. Use the pooled URL for serverless
traffic. Monitor compute hours, storage, query latency, and connection graphs after cutover. Expect a
cold-start delay after an idle database scales to zero. Upgrade before the database reaches the free
storage or compute allowance rather than treating the free tier as an unlimited production SLA.
