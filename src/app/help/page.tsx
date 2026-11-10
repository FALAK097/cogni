import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Setup & Troubleshooting Guide | Cogni",
  description:
    "Customer-facing setup and troubleshooting guide for Google sign-in, knowledge sources, widget installation, CSP, publication, and omnichannel human takeover.",
};

export default function HelpPage() {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <header className="mb-12 border-b border-border pb-8">
          <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Operations &amp; Setup Guide
          </p>
          <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Customer setup &amp; troubleshooting
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Follow this guide to set up your Cogni workspace, configure knowledge sources, embed the
            visitor widget with proper domain security, manage publications, and operate human
            takeover.
          </p>
          <nav aria-label="Table of contents" className="mt-8 flex flex-wrap gap-2 text-xs">
            <a
              href="#google-auth"
              className="rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground hover:bg-muted"
            >
              1. Google Auth &amp; Workspace
            </a>
            <a
              href="#knowledge-sources"
              className="rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground hover:bg-muted"
            >
              2. Knowledge Sources &amp; Ingestion
            </a>
            <a
              href="#widget-installation"
              className="rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground hover:bg-muted"
            >
              3. Widget Installation &amp; CSP
            </a>
            <a
              href="#publication"
              className="rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground hover:bg-muted"
            >
              4. Publication &amp; Rollback
            </a>
            <a
              href="#human-takeover"
              className="rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground hover:bg-muted"
            >
              5. Human Takeover &amp; Delivery
            </a>
            <a
              href="#troubleshooting"
              className="rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground hover:bg-muted"
            >
              6. Troubleshooting Matrix
            </a>
          </nav>
        </header>

        <div className="space-y-16 text-foreground">
          {/* 1. Google Authentication & Workspace */}
          <section id="google-auth" className="scroll-mt-24 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
              1. Google Authentication &amp; Workspace Setup
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Cogni operates on a supported Google-only authentication contract. Operators and
              teammates authenticate securely using their verified Google accounts.
            </p>
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-foreground">Getting Started</h3>
              <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-sm text-muted-foreground">
                <li>
                  Go to{" "}
                  <Link href="/sign-in" className="font-medium text-foreground underline">
                    /sign-in
                  </Link>{" "}
                  and click <strong>Continue with Google</strong>.
                </li>
                <li>
                  The first user to register becomes the workspace <strong>OWNER</strong>.
                </li>
                <li>
                  To invite teammates, visit <strong>Settings → Team</strong>, enter their Google
                  email address, and generate a workspace invite.
                </li>
                <li>
                  Copy and share the unique <code>/invite/&lt;token&gt;</code> link with the
                  invitee.
                </li>
                <li>
                  The teammate must open that link, sign in with the matching Google account, and
                  click <strong>Accept invite</strong>. (Signing in directly at /sign-in without
                  using the invite link will create a separate workspace instead of joining).
                </li>
              </ol>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/40 p-4 text-xs text-muted-foreground">
              <strong className="text-foreground">OAuth Configuration Tip:</strong> Ensure your
              Google Cloud OAuth consent screen includes the redirect URI:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                https://&lt;your-domain&gt;/api/auth/callback/google
              </code>
              .
            </div>
          </section>

          {/* 2. Knowledge Base & Ingestion */}
          <section id="knowledge-sources" className="scroll-mt-24 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
              2. Knowledge Sources &amp; Ingestion Lifecycle
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Your agent grounds answers strictly in your configured sources. Supported sources
              include public website URLs, uploaded documents (PDF, DOCX, TXT up to 10MB), and
              canonical written Q&amp;A answers.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">Processing Lifecycle</h3>
                <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Pending:</strong> Queued for extraction.
                  </li>
                  <li>
                    <strong className="text-foreground">Processing:</strong> Parsing, chunking, and
                    vector embedding.
                  </li>
                  <li>
                    <strong className="text-foreground">Ready / Indexed:</strong> Active and
                    searchable.
                  </li>
                  <li>
                    <strong className="text-destructive">Failed:</strong> Ingestion error; retry
                    available.
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">Immediate Grounding</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  As soon as a source reaches <strong>Ready / Indexed</strong>, its knowledge chunks
                  are immediately queried by both the <strong>Agent Test Console</strong> and live
                  visitor widgets. Widget publication and rollback manage behavior settings
                  (prompts, greetings, appearance), not knowledge content.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Widget Installation, Allowed Domains & CSP */}
          <section id="widget-installation" className="scroll-mt-24 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
              3. Widget Installation, Allowed Domains &amp; CSP
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Embed the widget loader script before the closing <code>&lt;/body&gt;</code> tag on
              your web pages:
            </p>
            <div className="rounded-2xl border border-border bg-[#171615] p-4 text-xs text-[#f4f1eb]">
              <p className="mb-2 text-[#aaa59e]">Copyable HTML embed snippet:</p>
              <pre className="overflow-x-auto font-mono leading-relaxed">
                {`<script
  src="https://<your-cogni-domain>/widget.bundle.js"
  data-widget-key="<YOUR_PUBLIC_KEY>"
  async
></script>`}
              </pre>
            </div>
            <div className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-foreground">
                Domain Authorization &amp; Origin Security
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The widget verifies <code>window.location.origin</code> against your workspace’s
                authorized domains. Configure your allowed domains in{" "}
                <strong>Agent → Customize &amp; Deploy → Authorized Domains</strong>. If loaded on
                an unlisted domain, the widget halts and reports an unauthorized origin rejection.
                Changes to authorized domains apply immediately upon saving and are not held in
                publication drafts.
              </p>
              <h3 className="pt-2 text-sm font-semibold text-foreground">
                Content Security Policy (CSP) Directives
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                If your site enforces a CSP header, include script, connect, inline styles, and font
                hosts:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs text-foreground">
                {`script-src 'self' https://<your-cogni-domain>;
connect-src 'self' https://<your-cogni-domain> wss://<your-cogni-domain>;
frame-src 'self' https://<your-cogni-domain>;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' https://<your-cogni-domain> data: blob:;`}
              </pre>
            </div>
          </section>

          {/* 4. Publication & Rollback */}
          <section id="publication" className="scroll-mt-24 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
              4. Publication, Drafts &amp; Version Rollback
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Cogni maintains separate draft and published configurations so you can refine prompt
              instructions, suggested questions, and appearance without risking live visitor
              conversations.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                <strong>Publishing:</strong> Click <strong>Publish Changes</strong> in{" "}
                <code>/agent#deploy</code>. This creates an immutable version record (e.g., v1, v2)
                and promotes the draft behavior settings to production.
              </li>
              <li>
                <strong>Rollback:</strong> In <strong>Publication History</strong>, view previous
                releases and click <strong>Roll Back to This Version</strong> to restore a verified
                earlier configuration. (Note: rollback restores widget behavior settings; it does
                not restore knowledge documents or domain allowlists, which apply immediately upon
                saving).
              </li>
            </ul>
          </section>

          {/* 5. Human Takeover & Channels */}
          <section id="human-takeover" className="scroll-mt-24 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
              5. Human Takeover &amp; Channel Delivery
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              When a conversation requires personal teammate assistance, Cogni pauses AI automation
              and hands the thread cleanly to human operators.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Receive-Capable
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Inbound webhooks are active. Visitor and channel messages arrive reliably in the
                  Inbox.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Send-Capable
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Outbound credentials are confirmed. Teammates can compose and send replies.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Provider-Confirmed
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  The upstream platform (Slack, WhatsApp, Discord) has acknowledged delivery with a
                  message ID.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-300/60 bg-amber-50/40 p-4 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-200">
              <strong className="font-semibold">
                Uncertain Delivery &amp; Duplicate Prevention:
              </strong>{" "}
              If an outbound reply cannot be confirmed by the channel provider, Cogni displays an
              amber warning and preserves your draft in the composer. Clicking Send again opens the{" "}
              <strong>Check channel delivery before retrying</strong> dialog. Check the external
              channel first; if the message did not arrive, confirm{" "}
              <strong>Send again anyway</strong>. If it did arrive, keep or clear the draft to
              prevent duplicates.
            </div>
          </section>

          {/* 6. Troubleshooting Matrix */}
          <section id="troubleshooting" className="scroll-mt-24 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
              6. Troubleshooting Matrix
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-border bg-muted/40 font-semibold text-foreground">
                  <tr>
                    <th className="px-4 py-3">Symptom</th>
                    <th className="px-4 py-3">Root Cause</th>
                    <th className="px-4 py-3">Remedy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">
                      Unauthorized domain error
                    </td>
                    <td className="px-4 py-3">Origin not in workspace allowlist</td>
                    <td className="px-4 py-3">
                      Add domain in <strong>Agent → Deploy → Authorized Domains</strong>.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">
                      Source ingestion failed
                    </td>
                    <td className="px-4 py-3">Paywalled URL or unreadable PDF text</td>
                    <td className="px-4 py-3">
                      Verify URL is public or upload a text-extractable PDF; click{" "}
                      <strong>Retry</strong>.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">
                      No answer in Test Console
                    </td>
                    <td className="px-4 py-3">Topic not covered by indexed sources</td>
                    <td className="px-4 py-3">
                      Add a document or canonical written answer in <strong>Knowledge Base</strong>.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">
                      Widget launcher missing
                    </td>
                    <td className="px-4 py-3">CSP blocked or script omitted</td>
                    <td className="px-4 py-3">
                      Ensure script is before <code>&lt;/body&gt;</code> and update site CSP
                      headers.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">
                      Delivery uncertain badge
                    </td>
                    <td className="px-4 py-3">Temporary channel provider outage or timeout</td>
                    <td className="px-4 py-3">
                      Check customer channel first; if message did not arrive, confirm{" "}
                      <strong>Send again anyway</strong> in the dialog.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </article>
    </MarketingShell>
  );
}
