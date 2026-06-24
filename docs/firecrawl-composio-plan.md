# Firecrawl and Composio Plan

## Current Fit

- Firecrawl should power knowledge-base website ingestion. The app already turns URL sources into document chunks and embeddings, so Firecrawl is an extraction upgrade, not a new domain model.
- Composio should back the existing integrations/action layer. The repo already models Gmail, Google Calendar, Slack, integration status, and action audit records, but execution is currently simulated.

## Firecrawl

1. Use `FIRECRAWL_API_KEY` for hosted Firecrawl requests.
2. For URL knowledge sources, request markdown with `onlyMainContent: true`.
3. Require Firecrawl for URL/file extraction so production and local development use the same parser.
4. Support crawl mode for docs sites so one submitted docs root can create multiple `Document` rows.

## Composio

1. Create Composio sessions with a stable user id derived from workspace and Better Auth user id.
2. Store reusable Composio session ids before enabling multi-turn agent tool use.
3. Restrict enabled toolkits to the workspace-connected integrations instead of exposing all Composio toolkits.
4. Prefer manual authentication from the dashboard integrations page before allowing public widget visitors to trigger tools.
5. Replace simulated integration execution with Composio-backed execution while preserving `IntegrationAction` as the local audit log.
6. Keep model execution on the existing AI SDK OpenAI and Gemini providers.

## Recommended Sequence

1. Firecrawl URL ingestion.
2. Dashboard Composio connect flow for Gmail, Google Calendar, and Slack.
3. Persist connected account metadata on the local `Integration` model.
4. Replace `executeIntegrationAction` simulation with explicit Composio tool calls.
5. Only after that, pass restricted Composio tools into `streamWidgetAgent` with approval rules for customer-facing actions.
