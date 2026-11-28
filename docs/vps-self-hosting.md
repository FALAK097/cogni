# Linux VPS deployment (starter)

This Compose package runs the Cogni Next.js application with SQLite (`node:sqlite`) on a Linux VPS.
SQLite stores conversations, workspace data, knowledge records, and durable ingestion jobs on a
persistent Docker volume (`sqlite_data`). Uploaded files live on a separate persistent Docker
volume (`uploads_data`). A small polling container invokes the protected ingestion drain. Queued
and retryable failed jobs remain in SQLite across worker restarts.

This is a reproducible VPS starter, not a claim that Cogni is fully self-contained. Grounded AI
answers still require a Cloudflare AI Search account, index, and API token, plus an OpenAI or Gemini
model key. Google OAuth is required for dashboard sign-in. Email delivery, Composio-backed actions,
and optional channel integrations need their own provider credentials. The `UPLOAD_STORAGE=local`
mode removes the R2 requirement for this Compose deployment; back up both `sqlite_data` and
`uploads_data` volumes together. Cloudflare Workers deployment uses the D1 binding configured in
`wrangler.jsonc` instead of this Compose package.

## Requirements

- A Linux VPS with Docker Engine and the Docker Compose plugin.
- A DNS name pointing at the VPS and a TLS reverse proxy such as Caddy or nginx. Keep port 3000
  bound to loopback; terminate HTTPS at the reverse proxy.
- Google OAuth client credentials with `https://<your-domain>/api/auth/callback/google` registered
  as an authorized redirect URI.
- A Cloudflare AI Search index and token, and one model provider key (`OPENAI_API_KEY` or
  `GEMINI_API_KEY`). The database's lexical fallback supports exact text matches, not semantic
  search; do not treat it as a substitute for AI Search.

## First install

1. Clone the repository on the VPS and enter the repository directory.
2. Create the deployment environment file and set secrets:

   ```sh
   cp .env.compose.example .env
   ```

   Replace the placeholders in `.env` with a `BETTER_AUTH_SECRET` from `openssl rand -base64 48`,
   your public HTTPS `BETTER_AUTH_URL`, Google OAuth credentials, a `CRON_SECRET` from
   `openssl rand -hex 16`, Cloudflare AI Search credentials/index, and one model API key.
   Compose passes only `CRON_SECRET` to the polling sidecar; `.env` remains available to the app
   and migration services. Keep `.env` private.

3. Build and start the services:

   ```sh
   docker compose up -d --build
   docker compose ps
   ```

   The migration service runs the committed Drizzle SQLite migrations once before the app starts.
   Inspect it with `docker compose logs migrate`; a failed migration prevents the app from starting.

4. Configure the TLS proxy to forward to `127.0.0.1:${APP_PORT:-3000}`. The widget and dashboard
   must use the same HTTPS origin configured in `BETTER_AUTH_URL`.
5. Check health and logs:

   ```sh
   curl --fail https://<your-domain>/api/health/live
   curl --fail https://<your-domain>/api/health/ready
   docker compose logs --tail=100 app ingestion-worker
   ```

   `/api/health/live` confirms that the web process responds. `/api/health/ready` also checks the
   database connection. Neither endpoint proves Google OAuth, Cloudflare AI Search, or model
   credentials are valid; verify those in the application before inviting a team.

The app image is built from the repository with Node.js 24 and the lockfile. Production uploads use
the named `uploads_data` volume mounted at `/app/.uploads`, and SQLite uses `sqlite_data` mounted
at `/app/.data`. Do not remove Compose volumes during routine upgrades. The web and migration
containers run as the unprivileged `cogni` user; the image prepares writable Next.js cache, upload,
and data directories for that user.

## Ingestion recovery

The app inserts each ingestion job into the workspace-scoped `workflow_run` table before reporting
it queued. The polling service calls `/api/cron/ingestion` using `CRON_SECRET`. Claims are atomic and
failed jobs retry up to the stored attempt limit. This Compose deployment sets
`INGESTION_RECLAIM_STALE=true`: workers claim each run with a random lease token and a two-minute
expiry, then renew the lease every 30 seconds. A crashed worker stops renewing and the polling worker
can reclaim an expired run. Completion and failure updates require the current token, and processing
checks ownership between extraction, indexing, and document-state changes. Document-level
serialization uses lease rows in `document_lock` with periodic renewal while active.

## Backup and restore

Schedule encrypted, off-host backups of both `sqlite_data` and `uploads_data`. Back up the SQLite
database cleanly using SQLite online backup (`sqlite3 .backup`) and archive `uploads_data` from the
same backup window; database attachment records can point to files in the upload volume.

Example backup commands (the Compose project name is `cogni`):

```sh
docker compose stop app ingestion-worker
docker run --rm \
  -v cogni_sqlite_data:/source:ro \
  -v "$PWD:/backup" \
  alpine:3.22 tar -czf /backup/cogni-sqlite.tgz -C /source .
docker run --rm \
  -v cogni_uploads_data:/source:ro \
  -v "$PWD:/backup" \
  alpine:3.22 tar -czf /backup/cogni-uploads.tgz -C /source .
docker compose up -d app ingestion-worker
```

## Upgrade and rollback

Pull the intended application revision, rebuild, and run Compose:

```sh
git fetch --tags
git checkout <release-tag-or-reviewed-commit>
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 migrate app ingestion-worker
```

The migration service applies forward-only migrations before the new app starts. Back up the
database and upload volume before upgrades.

## Troubleshooting and scope

- **App stays unhealthy:** inspect `docker compose logs app migrate`; verify SQLite volume
  permissions, `BETTER_AUTH_URL`, and required Google OAuth variables.
- **Knowledge ingestion stays queued:** check the worker and app logs, `CRON_SECRET`, AI Search
  credentials, model credentials, and the source's validation/extraction errors.
- **Grounded answers omit relevant sources:** verify that the configured `SEARCH_INDEX` belongs to
  the configured Cloudflare account and that ingestion reached `READY`.
- **Uploads disappear:** confirm the `uploads_data` volume is mounted and retained; database rows
  alone do not preserve uploaded bytes.
- **Integration or email actions are unavailable:** configure that integration's own credentials;
  they are not bundled with the Compose package.
