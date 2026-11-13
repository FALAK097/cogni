import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Setup & Troubleshooting | Cogni",
  description:
    "Set up a Cogni workspace, index knowledge, publish an agent, install the widget, and hand conversations to your team.",
};

const sectionLinkClass =
  "text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground";

export default function HelpPage() {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="mb-10">
          <p className="text-sm text-muted-foreground">Cogni help</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Set up and run customer support
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Follow the steps in order. Each section explains what Cogni does and what to check when
            a step does not work.
          </p>
          <nav aria-label="Guide sections" className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
            <a className={sectionLinkClass} href="#workspace">
              Workspace
            </a>
            <a className={sectionLinkClass} href="#sources">
              Knowledge sources
            </a>
            <a className={sectionLinkClass} href="#preview-publish">
              Preview and publish
            </a>
            <a className={sectionLinkClass} href="#install">
              Install the widget
            </a>
            <a className={sectionLinkClass} href="#takeover">
              Human takeover
            </a>
            <a className={sectionLinkClass} href="#channels">
              Channels
            </a>
          </nav>
        </header>

        <div className="space-y-12 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
          <section id="workspace" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              1. Sign in and set up a workspace
            </h2>
            <p>
              Use <strong className="text-foreground">Sign in with Google</strong> in production.
              The first Google sign-in creates a workspace and makes that user its owner. Local
              development may show email and password controls; they are not the production sign-in
              path.
            </p>
            <p>
              Workspace owners invite teammates from{" "}
              <strong className="text-foreground">Settings → Team</strong>. Share the invite link
              with them. They must open that link, sign in with the invited Google account, and
              accept the invitation to join the workspace.
            </p>
            <p>
              If Google sign-in or an invitation fails, retry with the Google account that received
              the invite. Ask a workspace owner to check the invitation and workspace membership.
              Deployment OAuth settings are managed by your Cogni administrator.
            </p>
          </section>

          <section id="sources" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              2. Add and keep knowledge current
            </h2>
            <p>
              In <strong className="text-foreground">Agent → Knowledge</strong>, add a website URL,
              sitemap, uploaded PDF or DOCX, or pasted text. A source moves through processing to
              indexed, or shows failed with an error. Only indexed sources can be retrieved for
              answers.
            </p>
            <p>
              Website and sitemap sources can be synced again to fetch current content. Use
              <strong className="text-foreground"> Reindex</strong> for an uploaded or pasted text
              source after replacing its content. Cogni does not automatically refresh a source on a
              schedule. The source row shows its last sync time.
            </p>
            <p>
              For a failed source, read the error, check that the website is reachable or the file
              is supported, then choose <strong className="text-foreground">Retry</strong>. Retry is
              available for failed sources. If the source is still processing, let it finish before
              trying again. Only workspace owners can add, sync, retry, or delete sources.
            </p>
            <p>
              Indexed source changes are used by preview and live conversations as soon as they are
              available. They are not part of a widget publication and cannot be restored by rolling
              back one.
            </p>
          </section>

          <section id="preview-publish" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              3. Test, publish, or roll back
            </h2>
            <p>
              Use <strong className="text-foreground">Agent → Test</strong> to try questions against
              the current draft and inspect source or handoff evidence. Preview conversations are
              temporary and do not become visitor conversations. Visitors continue to use the last
              published agent configuration until you publish.
            </p>
            <p>
              In <strong className="text-foreground">Agent → Deploy</strong>, publish the draft
              after the required test comparison passes. Publishing creates a version and updates
              the configuration used by live visitors. If a published configuration needs to be
              undone, open Version history and restore an earlier version. Restore changes the
              published agent configuration; it does not roll back knowledge sources or authorized
              domains.
            </p>
            <p>
              If publishing fails, the previously published version stays live. Resolve the error
              shown by the page, then run the test comparison again before publishing.
            </p>
          </section>

          <section id="install" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              4. Install and diagnose the widget
            </h2>
            <p>
              In <strong className="text-foreground">Agent → Deploy</strong>, add the exact
              hostnames that may host the widget under Authorized domains, such as
              <code> support.example.com</code> or <code>localhost</code>. Cogni matches hostnames,
              so omit the scheme and port. Changes take effect when saved; they are not part of a
              published version.
            </p>
            <p>
              Copy the embed code from Deploy and place it before the closing{" "}
              <code>&lt;/body&gt;</code> tag:
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-5 text-foreground">
              <code>{`<script src="https://<your-cogni-domain>/widget.bundle.js" data-widget-key="<YOUR_PUBLIC_KEY>" async></script>`}</code>
            </pre>
            <p>
              Replace the domain and key with the values in your copied code. If your website uses
              Content Security Policy, allow the Cogni domain in <code>script-src</code> and
              <code> connect-src</code>; allow <code>style-src 'unsafe-inline'</code> and
              <code> https://fonts.googleapis.com</code>, plus{" "}
              <code>font-src https://fonts.gstatic.com</code>
              when using the widget's web fonts. Keep your site's existing policies and add only the
              sources required by your deployment.
            </p>
            <p>
              If the launcher is missing, check that the script request succeeds, the key is copied
              correctly, and the page origin is listed in Authorized domains. In browser developer
              tools, look for a blocked script or API request and a CSP or unauthorized-origin
              message. A browser network or console error identifies which setting needs attention.
            </p>
          </section>

          <section id="takeover" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              5. Take over a conversation
            </h2>
            <p>
              When a visitor requests a person or a handoff rule matches, the conversation appears
              in <strong className="text-foreground">Conversations</strong>. A queued handoff means
              a teammate still needs to take it. Choose{" "}
              <strong className="text-foreground">Take over &amp; reply</strong>
              to assign it to yourself. The conversation shows who is assigned and that a teammate
              response is expected. AI replies are paused for a requested or assigned handoff; use
              <strong className="text-foreground"> Resume AI</strong> to let AI reply again.
            </p>
            <p>
              If the handoff was requested from an external channel, check that channel's inbound
              setup below. A Cogni connection by itself does not prove that inbound messages or
              outbound replies are configured.
            </p>
          </section>

          <section id="channels" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              6. Connect a provider or channel
            </h2>
            <p>
              The Connections page lists the integrations available to your workspace: Gmail, Google
              Calendar, Slack, Discord, Google Chat, WhatsApp, and Microsoft Teams. Their actions
              differ. Gmail and Calendar actions require approval; Slack is used for approved
              notifications; Discord supports approved bot messages; WhatsApp supports approved
              session or template messages. Google Chat and Teams channel messaging needs the
              provider's app credentials and webhook configuration. Check the connection's available
              actions before relying on it.
            </p>
            <p>
              For channels that use the shared Conversations inbox, inbound events require a
              configured provider webhook and credentials. Slack, Discord, Google Chat, Teams, and
              WhatsApp have channel adapters in Cogni; availability still depends on completing the
              provider setup for that workspace and deployment. WhatsApp message templates and
              service-window rules are set by Meta. Do not assume an integration listed as connected
              can receive messages.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Receive-capable:</strong> Cogni has received a
                valid inbound event through the configured provider channel.
              </li>
              <li>
                <strong className="text-foreground">Send-capable:</strong> the provider connection
                and channel setup allow Cogni to attempt an outbound message. A connected account
                alone does not establish this for every channel.
              </li>
              <li>
                <strong className="text-foreground">Provider-confirmed:</strong> the provider
                acknowledged a particular outbound message. This is stronger evidence than a send
                attempt; an uncertain result may need checking in the provider's own app before
                retrying.
              </li>
            </ul>
            <p>
              Cogni shows connection and action details in{" "}
              <strong className="text-foreground">Settings → Connections</strong>. If setup or
              delivery fails, check the provider's connection status, configured webhook, and action
              log. For an uncertain send, check the destination channel before sending again to
              avoid a duplicate.
            </p>
            <p>
              Need to change team access? Visit{" "}
              <Link className="underline underline-offset-4" href="/settings">
                Settings
              </Link>
              .
            </p>
          </section>
        </div>
      </article>
    </MarketingShell>
  );
}
