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
5. Set `BETTER_AUTH_URL` to the final production URL and add this Google OAuth redirect URI:

   ```text
   https://<production-domain>/api/auth/callback/google
   ```

6. Deploy to a Vercel preview and verify Google sign-in, workspace access, widget bootstrap/chat,
   file upload/download/delete, knowledge ingestion, and AI Search retrieval.
7. Move the production domain to Vercel and update widget embed URLs if the hostname changed.

## Rollback

Move the production domain back to the Worker if the Vercel verification fails. There is no D1 data
to reconcile; the new Neon database starts empty.

## Free-tier expectations

Neon's Free plan is suitable for the current two-user load. Use the pooled URL for serverless
traffic. Monitor compute hours, storage, query latency, and connection graphs after cutover. Expect a
cold-start delay after an idle database scales to zero. Upgrade before the database reaches the free
storage or compute allowance rather than treating the free tier as an unlimited production SLA.
