# Omnichannel integrations

Cogni uses one small, provider-neutral action runtime rather than provider-specific database
tables. The existing `integration`, `integration_action`, `approval_request`, `workflow_run`,
`workflow_step`, `conversation`, `contact`, and `domain_event` records provide connection state,
auditing, approvals, workflow progress, inbox history, identity, and webhook telemetry. Adding a
tool does not require a schema migration.

## Runtime boundaries

1. The caller selects an allowlisted action from `tool-registry.ts`.
2. Zod validates the application-facing input and the conversation is checked against the active
   workspace.
3. Read-only/low-risk actions execute with an idempotency key. External writes create an approval.
4. Approved actions are translated to the provider's exact Composio schema and pinned to the
   workspace's connected account.
5. `integration_action` records the payload, status, result, and failure without storing OAuth
   credentials.

The public widget currently exposes two bounded calendar tools: check availability and request a
booking. Availability is read-only. A booking remains pending until a signed, authenticated
workspace approval executes it.

## Supported capability matrix

| Integration     | Current actions                                     | Inbound support                                             |
| --------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| Google Calendar | Free-slot lookup; approved event creation           | Not applicable                                              |
| Gmail           | Approved draft creation and email send              | Not enabled                                                 |
| Slack           | Approved channel notification                       | Chat SDK webhook route                                      |
| Discord         | Approved bot message with mentions disabled         | Chat SDK/Discord webhook requires bot credentials           |
| WhatsApp        | Approved session message; approved template message | Chat SDK/Meta webhook requires Cloud API credentials        |
| Google Chat     | Connected account                                   | Chat SDK/Google Chat webhook requires a verified Google app |
| Teams           | Connected account                                   | Chat SDK/Teams webhook requires Azure app credentials       |
| Resend          | Approved support email                              | Resend webhook can be configured separately                 |

Composio presently lists no Discord Bot trigger and only a WhatsApp message-status trigger. Cogni
therefore does not claim that connecting those accounts alone enables inbound conversations.
Provider webhook adapters remain necessary for inbound messages.

## Production configuration

- Set `COMPOSIO_API_KEY` and create a webhook subscription pointing to
  `https://<app>/api/webhooks/composio`.
- Store the returned signing secret in `COMPOSIO_WEBHOOK_SECRET`. The endpoint rejects unsigned
  requests, verifies the connected account belongs to the same workspace, deduplicates event IDs,
  and persists only non-sensitive delivery fields.
- Google Chat needs custom OAuth credentials and Google's production verification for restricted
  Chat scopes.
- Discord needs `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, and
  `DISCORD_PUBLIC_KEY`. Keep the default least-privilege permission integer unless the product
  needs another permission.
- WhatsApp needs Meta Business/Cloud API configuration, a phone-number ID, approved templates, and
  a Meta webhook for inbound messages. Free-form outbound messages are limited to the customer
  service window; use an approved template outside it.
- Configure provider redirect/webhook URLs for each deployment environment and never expose any
  provider token to the browser.

Composio's user page uses the stable workspace UUID because it is the security boundary for
connected accounts. New connection aliases include the workspace name and short ID for operator
readability. Customer profile name/email belongs in Cogni's workspace-scoped `contact` record;
using customer PII as Composio's cross-provider user key would weaken tenant isolation.

## Operational rules

- External writes require approval by default.
- Every retry reuses an idempotency key; a running or completed action is not executed twice.
- WhatsApp templates are required outside the 24-hour service window.
- Discord outbound messages disable automatic mentions to prevent accidental mass notifications.
- Webhook payloads are treated as untrusted input even after signature verification.
- Failed provider calls are recorded and surfaced without leaking credentials.

References: [Composio triggers](https://docs.composio.dev/docs/tools/triggers),
[Composio Discord Bot](https://docs.composio.dev/toolkits/discordbot),
[Composio WhatsApp](https://docs.composio.dev/toolkits/whatsapp),
[WhatsApp Cloud API webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks), and
[AI SDK tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling).
