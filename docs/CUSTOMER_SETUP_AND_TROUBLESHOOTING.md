# Customer setup and troubleshooting

This guide follows the current Cogni setup flow. The in-product version is available at `/help`.

## 1. Sign in and set up a workspace

Use **Sign in with Google** in production. The first Google sign-in creates a workspace and makes
that user its owner. Local development may show email and password controls; they are not the
production sign-in path.

Workspace owners invite teammates from **Settings → Team**. Share the invite link with the teammate.
They must open that link, sign in with the invited Google account, and accept the invitation to join
the workspace. If sign-in or an invitation fails, retry with the Google account that received the
invite and ask an owner to check workspace membership. Deployment OAuth settings are managed by the
Cogni administrator.

## 2. Add and keep knowledge current

In **Agent → Knowledge**, add a website URL, sitemap, uploaded PDF or DOCX, or pasted text. A source
is processed and then becomes indexed, or shows failed with an error. Only indexed sources can be
retrieved for answers.

Website and sitemap sources can be synced again to fetch current content. Use **Reindex** to process
an uploaded or pasted text source again. Cogni does not replace stored content in place. To change the
content, delete the source and add the new file or text. Cogni does not automatically refresh a source
on a schedule. The source row shows its last sync time.

For a failed source, read the error, check that the website is reachable or the file is supported,
then choose **Retry**. Retry is available for failed sources. If the source is still processing,
let it finish before trying again. Only workspace owners can add, sync, retry, or delete sources.

Indexed source changes are used by preview and live conversations as soon as they are available.
They are not part of a widget publication and cannot be restored by rolling back one.

## 3. Test, publish, or roll back

Use **Agent → Test** to try questions against the current draft and inspect source or handoff
evidence. Preview conversations are temporary and do not become visitor conversations. Visitors
continue to use the last published agent configuration until you publish.

In **Agent → Deploy**, publish the draft after the required test comparison passes. Publishing
creates a version and updates the configuration used by live visitors. If a published configuration
needs to be undone, open Version history and restore an earlier version. Restore changes the
published agent configuration; it does not roll back knowledge sources or authorized domains.

If publishing fails, the previously published version stays live. Resolve the error shown by the
page, then run the test comparison again before publishing.

## 4. Install and diagnose the widget

In **Agent → Deploy**, add the hostnames that may host the widget under **Authorized domains**, such
as `support.example.com` or `localhost`. Cogni matches hostnames, so omit the scheme and port.
Changes take effect when saved and are not part of a published version.

Copy the embed code from Deploy and place it before the closing `</body>` tag:

```html
<script
  src="https://<your-cogni-domain>/widget.bundle.js"
  data-widget-key="<YOUR_PUBLIC_KEY>"
  async
></script>
```

Use the domain and key from the copied code. If your website uses Content Security Policy (CSP),
allow the Cogni domain in `script-src` and `connect-src`. The widget injects inline styles and may
load its web fonts from Google Fonts, so allow `'unsafe-inline'` and `https://fonts.googleapis.com`
in `style-src`, and `https://fonts.gstatic.com` in `font-src` when those fonts are used. Keep the
site's existing policies and add only the sources required by your deployment.

If the launcher is missing, check that the script request succeeds, the key is copied correctly,
and the page hostname is listed in Authorized domains. In browser developer tools, look for a blocked
script or API request and a CSP or unauthorized-origin message. The network or console error points
to the setting to check.

## 5. Take over a conversation

When a visitor requests a person or a handoff rule matches, the conversation appears in
**Conversations**. A queued handoff means a teammate still needs to take it. Choose **Take over &
reply** to assign it to yourself. The conversation shows the assignee and that a teammate response
is expected. AI replies are paused for a requested or assigned handoff; use **Resume AI** to let AI
reply again.

If the handoff came from an external channel, check that channel's inbound setup. A Cogni connection
by itself does not prove that inbound messages or outbound replies are configured.

## 6. Connect a provider or channel

The Connections page lists the integrations available to the workspace: Gmail, Google Calendar,
Slack, Discord, Google Chat, WhatsApp, and Microsoft Teams. Their actions differ. Gmail and Calendar
actions require approval; Slack is used for approved notifications; Discord supports approved bot
messages; WhatsApp supports approved session or template messages. Google Chat and Teams channel
messaging needs the provider's app credentials and webhook configuration. Check the connection's
available actions before relying on it.

For channels that use the shared Conversations inbox, inbound events require a configured provider
webhook and credentials. Slack, Discord, Google Chat, Teams, and WhatsApp have channel adapters in
Cogni; availability still depends on completing provider setup for that workspace and deployment.
WhatsApp message templates and service-window rules are set by Meta. A connection marked connected
does not by itself mean that it can receive messages.

These terms describe what has been proven for a channel; they are not separate connection statuses
shown in the current interface:

- **Receive-capable:** Cogni has received a valid inbound event through the configured provider
  channel.
- **Send-capable:** the provider connection and channel setup allow Cogni to attempt an outbound
  message. A connected account alone does not establish this for every channel.
- **Provider-confirmed:** the provider acknowledged a particular outbound message. This is stronger
  evidence than a send attempt. If the result is uncertain, check the provider app before retrying.

Cogni shows connection and action details in **Settings → Connections**. If setup or delivery fails,
check the provider connection, configured webhook, and action log. For an uncertain send, check the
destination channel before sending again to avoid a duplicate.
