# Customer Setup and Troubleshooting Contract

This guide establishes the official customer-facing setup, verification, and troubleshooting path for Cogni. It is written for workspace owners and teammates to configure, verify, and diagnose their Cogni deployment without developer intervention.

---

## 1. Google Authentication & Workspace Setup

Cogni enforces a **Google-only authentication contract** for operator access.

### Setup Flow

1. **Sign In**: Navigate to `/sign-in` and select **Continue with Google**.
2. **Workspace Creation**: The initial user to sign in initializes the workspace and is assigned the `OWNER` role.
3. **Inviting Teammates**: Workspace owners invite team members from **Settings → Team** by entering their Google email address and selecting their role (`MEMBER` or `OWNER`).
4. **Sharing the Invite Link**: Cogni generates a unique invite link (`https://<your-cogni-domain>/invite/<token>`). The workspace owner must copy and share this link directly with the invitee.
5. **Accepting the Invitation**:
   - The teammate opens the unique `/invite/<token>` link in their browser.
   - They click **Sign in with Google** using the matching invited email address.
   - Once authenticated with the matching account, they click **Accept invite** to join the workspace.
   - _Important_: Signing in directly at `/sign-in` without opening the invite link will NOT accept the invitation; it places the user in a separate isolated workspace. Teammates must open the invite link and accept to join.

### Troubleshooting Google Sign-In

- **"Invalid OAuth credentials"**: Verify that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correctly configured in the server environment.
- **Redirect URI Mismatch**: In the Google Cloud Console, ensure the authorized redirect URI includes:
  ```text
  https://<your-cogni-domain>/api/auth/callback/google
  ```
- **Permission Denied**: Non-owners attempting administrative actions (such as deleting conversations, creating integrations, or modifying workspace settings) will receive a `403 Forbidden` response. Administrative actions require the `OWNER` role.

---

## 2. Knowledge Base & Ingestion Lifecycle

Cogni's AI agent answers customer questions strictly grounded in your configured knowledge sources.

### Supported Source Types

- **Website URLs**: Scrapes and indexes publicly accessible web pages and documentation.
- **Uploaded Documents**: Supports `.pdf`, `.docx`, and `.txt` files up to the workspace upload size limit (10MB).
- **Written Answers (Q&A)**: Direct prompt-and-response pairs crafted by your team for canonical responses.

### Ingestion Lifecycle States

1. `pending`: The source has been registered and queued for background processing.
2. `processing`: Content is being extracted, sanitized, chunked, and vectorized via the ingestion worker.
3. `ready` / `indexed`: Vectors are stored and ready for retrieval.
4. `failed`: Ingestion failed (e.g., paywalled URL, malformed PDF, or provider rate limit).

### Troubleshooting Ingestion

- **Source Stuck in `pending` or `processing`**: Sources are processed asynchronously by the background ingestion queue. If a job stalls due to queue backpressure or unhandled worker errors, wait for the queue to drain, or delete and re-register the source. The **Retry** action is available only after a source enters `failed` status.
- **Source `failed`**: Review the failure message in the table. Click **Retry** on the failed source row once the transient error (e.g., rate limit, network timeout) is cleared. For website pages, ensure the URL is publicly reachable without authentication or CAPTCHAs. For documents, verify the PDF contains extractable text (scanned image-only PDFs require OCR preprocessing).
- **Knowledge Sources Go Live Immediately**:
  - As soon as a source transitions to `ready` / `indexed`, its vectorized chunks are **immediately available to both the Test Console and live visitor conversations** via RAG retrieval.
  - Knowledge chunks are not gated behind the "Publish Changes" button. **Widget publication and rollback apply to agent configuration and behavior settings** (system prompt, greeting, appearance, allowed domains), NOT to knowledge base content. Knowledge changes cannot be undone through widget version rollback.

---

## 3. Widget Installation, Allowed Domains & CSP

### Installation Snippet

Embed the Cogni loader immediately before the closing `</body>` tag on your website:

```html
<!-- Cogni Support Widget -->
<script
  src="https://<your-cogni-domain>/widget.bundle.js"
  data-widget-key="<YOUR_PUBLIC_KEY>"
  async
></script>
```

Replace `<your-cogni-domain>` with your deployed Cogni domain and `<YOUR_PUBLIC_KEY>` with the public key found in **Agent → Deploy**.

### Allowed Domains (Origin Verification)

The widget validates the hosting site's `window.location.origin` against the workspace's authorized domains list:

1. In **Agent → Customize & Deploy**, navigate to **Authorized Domains**.
2. Add your hostnames (e.g., `app.example.com`, `https://example.com`, or `localhost:3000` for development).
3. If an unauthorized domain loads the script, the widget refuses to initialize and logs an unauthorized origin rejection to the browser console.

### Content Security Policy (CSP) Directives

If your website enforces a strict Content Security Policy, include the following directives:

```text
script-src 'self' https://<your-cogni-domain>;
connect-src 'self' https://<your-cogni-domain> wss://<your-cogni-domain>;
frame-src 'self' https://<your-cogni-domain>;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' https://<your-cogni-domain> data: blob:;
```

### Installation Verification Checklist

1. Open your website in a desktop browser and open Developer Tools (**F12 → Console**).
2. Check for the Cogni launcher icon in the bottom-right corner.
3. If the widget is missing:
   - Search Network tab for `widget.bundle.js` — status should be `200 OK`.
   - Search Network tab for `/api/widget/<PUBLIC_KEY>/config` — status should be `200 OK`.
   - Verify no CSP errors (`Refused to load script...`) appear in the Console.
   - Verify your current origin matches one of your **Authorized Domains**.

---

## 4. Publication, Drafts & Version Rollback

Cogni separates **draft configuration** from **live visitor behavior** to prevent breaking customer experiences during edits.

### How Publication Works

- Edits made in **Build** (greeting, system prompt, suggested questions, appearance, allowed domains) are saved as a **Draft**.
- The draft configuration can be thoroughly tested in the embedded **Test Console** (`/agent#test`) without affecting live visitors.
- When satisfied, click **Publish Changes** in `/agent#deploy`. This creates an immutable publication record (`v1`, `v2`, etc.) and immediately promotes the draft configuration to live visitors.
- **Important**: Publication snapshots capture widget settings and agent behavior parameters, not knowledge source documents (which go live immediately upon indexing).

### Rollback

If a published widget configuration causes unwanted behavior or regression:

1. Navigate to **Agent → Deploy → Publication History**.
2. Select any previously verified publication snapshot.
3. Click **Roll Back to This Version**. The widget instantly reverts its configuration to that historical snapshot. (Note: rollback restores widget behavior settings, not deleted or modified knowledge base documents).

---

## 5. Human Takeover & Omnichannel Operations

When a customer request exceeds the AI agent's grounded confidence or requires personal assistance, Cogni facilitates seamless human handoff.

### Takeover Trigger & AI Pause

- When a teammate sends a reply or clicks **Take Over** in the Inbox, **AI generation is immediately paused** for that conversation (`aiPaused: true`).
- The conversation header displays an **AI Paused** badge.
- The AI will not generate automated replies while human operators are active on the conversation.
- Teammates can re-enable the AI at any time by clicking **Resume AI**.

### Channel Capabilities & Status Glossary

When connecting external channels (e.g., Slack, WhatsApp, Discord, Google Chat) in **Settings → Connections**:

- **`receive-capable`**: Inbound webhooks are verified. Messages sent by customers on this channel are successfully received and ingested into the Cogni shared inbox.
- **`send-capable`**: Outbound authentication tokens and credentials are confirmed. Teammates can compose and dispatch replies from Cogni back to the customer on that channel.
- **`provider-confirmed`**: The upstream messaging provider has acknowledged receipt and returned an immutable provider message ID.

### Uncertain Delivery & Duplicate Prevention

If an outbound response suffers network degradation or provider API rate limiting:

- Cogni displays an amber warning toast indicating delivery confirmation is pending or uncertain.
- Cogni retains your message draft in the composer so no text is lost.
- If you click **Send** again, Cogni surfaces the **"Check channel delivery before retrying"** confirmation dialog.
- **Operator Action**: First check the external channel (e.g. WhatsApp, Slack, or email) to verify whether your initial reply was already delivered upstream.
  - If the reply did NOT arrive: click **Send again anyway** to dispatch the message.
  - If the reply did arrive: click **Keep draft** (or clear the composer) to prevent sending a duplicate message to the customer.

---

## 6. Diagnostic Matrix: Error States & Recovery Playbook

| Symptom / Error                       | Root Cause                                           | Operator Action                                                                         |
| :------------------------------------ | :--------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| **"Unauthorized domain" in console**  | Current website origin is not in workspace allowlist | Add domain in **Agent → Deploy → Authorized Domains**.                                  |
| **"Source failed: Rate limit"**       | Website crawler or embedding model throttled         | Wait 2 minutes and click **Retry** on the failed source row.                            |
| **"No answer found" in Test Console** | Question is outside the knowledge base context       | Add relevant documentation or written Q&A under **Knowledge Base**.                     |
| **Widget launcher not rendering**     | Script tag omitted or CSP blocking connection        | Verify script placement before `</body>` and add domain to CSP directives.              |
| **"Delivery uncertain" in Inbox**     | Channel provider temporary outage or rate limit      | Check customer channel first; if message did not arrive, confirm **Send again anyway**. |
| **403 when updating agent**           | Member role lacks owner permissions                  | Request an `OWNER` teammate to publish or grant elevated permissions.                   |
