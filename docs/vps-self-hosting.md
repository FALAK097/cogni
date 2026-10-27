# Linux VPS deployment (starter)

This Compose package runs the Cogni Next.js application and PostgreSQL on a Linux VPS. PostgreSQL
stores conversations, workspace data, knowledge records, and durable ingestion jobs. Uploaded files
live on a separate persistent Docker volume. A small polling container invokes the protected
ingestion drain. Queued and retryable failed jobs remain in PostgreSQL across worker restarts.

This is a reproducible VPS starter, not a claim that Cogni is fully self-contained. Grounded AI
answers still require a Cloudflare AI Search account, index, and API token, plus an OpenAI or Gemini
model key. Google OAuth is required for dashboard sign-in. Email delivery, Composio-backed actions,
and optional channel integrations need their own provider credentials. The `UPLOAD_STORAGE=local`
mode removes the R2 requirement for this Compose deployment; back up the `uploads_data` volume with
the database. Cloudflare Workers deployment is not supported by this package.

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
   cp .env.example .env
   cp .env.db.example .env.db
   ```

   Set `POSTGRES_PASSWORD` in `.env.db` to a unique URL-safe secret, and set `DATABASE_URL` in `.env`
   to `postgresql://cogni:<same-secret>@db:5432/cogni`. Also set `BETTER_AUTH_SECRET` to at least 32
   random characters, `BETTER_AUTH_URL` to the public HTTPS origin, Google OAuth credentials, and one
   model API key. Set `CRON_SECRET` to at least 16 random characters. Compose passes only this value
   to the polling sidecar; `.env` remains available to the app and migration services. Set
   `CLOUDFLARE_ACCOUNT_ID`,
   `CLOUDFLARE_AI_SEARCH_TOKEN` (or `CLOUDFLARE_API_TOKEN`), and `SEARCH_INDEX` for semantic
   retrieval. The app services load `.env`; PostgreSQL receives only the password from `.env.db`. Keep both files private.

3. Build and start the services:

   ```sh
   docker compose up -d --build
   docker compose ps
   ```

   The migration service runs the committed Drizzle migrations once before the app starts. Inspect
   it with `docker compose logs migrate`; a failed migration prevents the app from starting.

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

The app image is built from the repository with Node.js 22 and the lockfile. Production uploads use
the named `uploads_data` volume mounted at `/app/.uploads`. Do not remove Compose volumes during
routine upgrades. The web and migration containers run as the unprivileged `cogni` user; the image
prepares writable Next.js cache and upload directories for that user.

## Ingestion recovery

The app inserts each ingestion job into the workspace-scoped `workflow_run` table before reporting
it queued. The polling service calls `/api/cron/ingestion` using `CRON_SECRET`. Claims are atomic and
failed jobs retry up to the stored attempt limit. This Compose deployment sets
`INGESTION_RECLAIM_STALE=true`: workers claim each run with a random lease token and a two-minute
expiry, then renew the lease every 30 seconds. A crashed worker stops renewing and the polling worker
can reclaim an expired run. Completion and failure updates require the current token, and processing
checks ownership between extraction, indexing, and document-state changes. Runs without lease data
from older deployments retain the conservative ten-minute age check. Vercel/Cloudflare uses the same
lease behavior when stale recovery is enabled. This queue is database-backed polling, not Cloudflare
Queues.

Each app process uses one connection in the regular database pool plus at most two short-lived,
dedicated advisory-lock connections, for a maximum of three ingestion-related PostgreSQL connections
per process. At most two document-index operations hold lock connections in one process at a time;
additional jobs wait while rechecking their lease. On Neon, set `DATABASE_URL_UNPOOLED` to the direct
connection string because session advisory locks need backend session affinity. The app uses this URL
only for advisory locks; `DATABASE_URL` remains the application query connection. If Neon pooling is
detected without `DATABASE_URL_UNPOOLED`, startup fails with a configuration error. Local and VPS
PostgreSQL can use `DATABASE_URL` for both. Size the PostgreSQL connection budget for this
per-process cap multiplied by the number of app processes, plus cron, migrations, and other clients.

The lease fences workflow transitions and checkpoints, but an already-started external search write
cannot be cancelled if a process is suspended until after its lease expires. Keep indexing idempotent
and investigate provider state if a worker is force-stopped during indexing. This starter does not
include a dashboard recovery action; expired runs are recovered by the polling worker.

## Backup and restore

Schedule encrypted, off-host backups of both PostgreSQL and `uploads_data`. The application does not
currently include a backup scheduler or a restore command, so operate these with your chosen host
backup tooling and verify restoration on a separate instance before relying on the installation.
Keep the database and upload snapshots from the same backup window; database attachment records can
point to files in the upload volume.

Example database dump from the Compose project:

```sh
docker compose exec -T db sh -c 'pg_dump -U cogni -d cogni' > cogni.sql
```

Example upload-volume archive (the Compose project name is `cogni`):

```sh
docker run --rm \
  -v cogni_uploads_data:/source:ro \
  -v "$PWD:/backup" \
  alpine:3.22 tar -czf /backup/cogni-uploads.tgz -C /source .
```

Restore into an empty database only after stopping the app and worker:

```sh
docker compose stop app ingestion-worker
docker compose exec -T db sh -c 'dropdb -U cogni --if-exists cogni && createdb -U cogni cogni'
cat cogni.sql | docker compose exec -T db psql -U cogni -d cogni
docker run --rm -i \
  -v cogni_uploads_data:/target \
  -v "$PWD:/backup" \
  alpine:3.22 sh -c 'tar -xzf /backup/cogni-uploads.tgz -C /target'
docker compose up -d app ingestion-worker
```

Back up the upload volume with Docker-aware tooling; never assume that a database dump includes
uploaded files. Test both restoration steps and verify attachment downloads before declaring a
backup recoverable.

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
database and upload volume before upgrades. If a migration has changed data or schema, rolling back
the image alone may not be safe: restore the pre-upgrade database and upload backup, then start the
previous reviewed revision. No automated destructive rollback is provided.

## Troubleshooting and scope

- **App stays unhealthy:** inspect `docker compose logs app migrate`; verify PostgreSQL readiness,
  `BETTER_AUTH_URL`, and required Google OAuth variables.
- **Knowledge ingestion stays queued:** check the worker and app logs, `CRON_SECRET`, AI Search
  credentials, model credentials, and the source's validation/extraction errors.
- **Grounded answers omit relevant sources:** verify that the configured `SEARCH_INDEX` belongs to
  the configured Cloudflare account and that ingestion reached `READY`.
- **Uploads disappear:** confirm the `uploads_data` volume is mounted and retained; database rows
  alone do not preserve uploaded bytes.
- **Integration or email actions are unavailable:** configure that integration's own credentials;
  they are not bundled with the Compose package.

This starter has not been verified on a clean Linux VPS in this change. It does not include a reverse
proxy, automatic TLS, automated backup scheduling, Cloudflare Workers deployment, or a provider-free
AI search/model stack. Those remain separate operational work and acceptance gates.
